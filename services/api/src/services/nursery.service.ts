import { Prisma, PrismaClient } from '@arth/db';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { notify } from './notification.service';
import { recordNurseryContribution, recomputeReputation, getReputationSummary } from './nurseryReputation.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { startOfUtcDay, addDays } from './streak.service';
import { geocodeAddress } from '../utils/geocode';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';
import { getNurseryImpactTotals } from './treeImpact.service';
import { cached, invalidatePrefix, nurseryKey, nurseryPrefix } from '../utils/ttlCache';

// Short TTLs: these aggregates are polled by the app, so a few seconds of caching removes nearly
// all the repeat load while staying effectively live. Writes that change them invalidate the whole
// nursery's prefix (see invalidateNurseryCache) so the owner sees their own edits immediately.
const STATS_TTL_MS = 10_000;
const IMPACT_TTL_MS = 30_000;

/** Drops every cached aggregate for a nursery – call after anything that changes stock, orders,
 * reservations or supply numbers. */
export function invalidateNurseryCache(nurseryId: string) {
  invalidatePrefix(nurseryPrefix(nurseryId));
}

interface UpdateProfileInput {
  nurseryName?: string;
  description?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  line1?: string;
  city?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  offersDelivery?: boolean;
  deliveryRadiusKm?: number | null;
  followPolicy?: 'open' | 'approval';
  offersPickup?: boolean;
  deliveryFeeCents?: number | null;
  minDeliveryOrderCents?: number | null;
  operatingHours?: unknown;
  pickupWindows?: unknown;
  pickupInstructions?: string;
}

interface InlineSpeciesInput {
  commonName: string;
  scientificName?: string;
  localName?: string;
  emoji?: string;
  isNative?: boolean;
  sunlightNeeds?: 'full_sun' | 'partial_shade' | 'shade';
  waterNeeds?: 'low' | 'medium' | 'high';
  soilNeeds?: string;
  matureHeightLabel?: string;
  plantingSeasons?: string[];
  co2KgPerYear?: number;
  description?: string;
}

interface StockInput {
  speciesId?: string;
  species?: InlineSpeciesInput;
  quantity: number;
  isFree?: boolean;
  priceCents?: number;
  photoUrl?: string;
  ageLabel?: string;
  heightLabel?: string;
  potSize?: string;
  suitableEnvironments?: string[];
  nurseryNotes?: string;
  lowStockThreshold?: number;
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.nurseryProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Nursery profile not found');
  return profile;
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const profile = await getOwnProfile(prisma, userId);

  const nextOffersDelivery = input.offersDelivery ?? profile.offersDelivery;
  const nextOffersPickup = input.offersPickup ?? profile.offersPickup;
  if (!nextOffersDelivery && !nextOffersPickup) {
    throw new BadRequestError('A nursery must offer at least one of pickup or delivery');
  }
  // A nursery can set its location either by GPS (lat/lng sent directly) or by typing an address
  // (line1, geocoded here into lat/lng) — GPS wins if both arrive in the same request, since a
  // fresh device fix is always more precise than a text-address lookup.
  let geocodedLat: number | undefined;
  let geocodedLng: number | undefined;
  // Only when the address text actually changed: the app re-sends the stored line1 on every save
  // (radius, fees, hours...), and re-geocoding that unchanged text can fail - e.g. a label that came
  // from reverse-geocoding a GPS fix - which blocked unrelated edits for a nursery that already has
  // a perfectly good saved location.
  const addressChanged = (input.line1 ?? '').trim() !== (profile.line1 ?? '').trim();
  const hasSavedLocation = profile.lat != null && profile.lng != null;
  if (input.line1 && input.lat == null && input.lng == null && (addressChanged || !hasSavedLocation)) {
    const query = [input.line1, input.city ?? profile.city].filter(Boolean).join(', ');
    const result = await geocodeAddress(query);
    if (!result) {
      throw new BadRequestError("Couldn't find that address. Try adding more detail, or use your current location instead.");
    }
    geocodedLat = result.lat;
    geocodedLng = result.lng;
  }

  // Pickup needs somewhere to collect from and delivery needs an origin point (partner tracking),
  // so either one being on requires a real address with a resolved location. Only enforced when
  // the request touches the toggles or the address, not on every unrelated profile edit, so a
  // nursery that predates this check can still save other changes.
  const touchesFulfilment =
    input.offersPickup === true || input.offersDelivery === true || input.line1 !== undefined || input.lat != null || input.lng != null;
  if ((nextOffersPickup || nextOffersDelivery) && touchesFulfilment) {
    const nextLine1 = (input.line1 ?? profile.line1 ?? '').trim();
    const nextLat = input.lat ?? geocodedLat ?? profile.lat;
    const nextLng = input.lng ?? geocodedLng ?? profile.lng;
    if (!nextLine1 || nextLat == null || nextLng == null) {
      throw new BadRequestError('Add a valid nursery address before offering pickup or delivery');
    }
  }

  const updated = await prisma.nurseryProfile.update({
    where: { id: profile.id },
    data: {
      ...input,
      ...(geocodedLat != null && geocodedLng != null ? { lat: geocodedLat, lng: geocodedLng } : {}),
    } as Prisma.NurseryProfileUpdateInput,
  });

  // Switching to "open" means follows no longer need approval — without this, any request that
  // queued up while policy was "approval" would sit `pending` forever, since nothing else ever
  // revisits an existing Follow row after the policy that created it changes.
  if (input.followPolicy === 'open' && profile.followPolicy !== 'open') {
    await prisma.follow.updateMany({
      where: { nurseryId: profile.id, status: 'pending' },
      data: { status: 'accepted', respondedAt: new Date() },
    });
  }

  return updated;
}

// Resolves a stock write's species link — exactly one of speciesId/species is expected (Zod
// enforces this on create; update allows omitting both to leave the existing link untouched).
// speciesId re-links to an existing catalog entry as-is. An inline `species` payload finds an
// existing TreeSpecies by case-insensitive commonName match (same convention as
// species.routes.ts's open quick-add) and upgrades it to curated botanical detail, or creates a
// new curated row — curated because only the approval-gated nursery role can reach this path.
async function resolveSpeciesLink(
  prisma: PrismaClient,
  input: Pick<StockInput, 'speciesId' | 'species'>,
): Promise<{ speciesId?: string; speciesDisplayName?: string }> {
  if (input.speciesId) {
    const species = await prisma.treeSpecies.findUnique({ where: { id: input.speciesId } });
    if (!species) throw new NotFoundError('Species not found');
    return { speciesId: species.id, speciesDisplayName: species.commonName };
  }

  if (!input.species) return {};
  const commonName = input.species.commonName.trim();

  // Shared catalog only — a planter's private species must not be upgraded into a public one.
  const existing = await prisma.treeSpecies.findFirst({
    where: { commonName: { equals: commonName, mode: 'insensitive' }, createdByUserId: null },
  });

  const botanicalData = {
    scientificName: input.species.scientificName,
    localName: input.species.localName,
    isNative: input.species.isNative,
    sunlightNeeds: input.species.sunlightNeeds,
    waterNeeds: input.species.waterNeeds,
    soilNeeds: input.species.soilNeeds,
    matureHeightLabel: input.species.matureHeightLabel,
    plantingSeasons: input.species.plantingSeasons,
    co2KgPerYear: input.species.co2KgPerYear,
    description: input.species.description,
    isCuratedBotanical: true,
    addedByRole: 'nursery' as const,
  };

  if (existing) {
    const updated = await prisma.treeSpecies.update({ where: { id: existing.id }, data: botanicalData });
    return { speciesId: updated.id, speciesDisplayName: updated.commonName };
  }

  const baseKey = commonName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'species';
  let key = baseKey;
  let suffix = 1;
  while (await prisma.treeSpecies.findUnique({ where: { key } })) {
    suffix += 1;
    key = `${baseKey}_${suffix}`;
  }
  const maxSortOrder = await prisma.treeSpecies.aggregate({ _max: { sortOrder: true } });

  const created = await prisma.treeSpecies.create({
    data: {
      key,
      commonName,
      emoji: input.species.emoji ?? '🌱',
      isActive: true,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      ...botanicalData,
    },
  });
  return { speciesId: created.id, speciesDisplayName: created.commonName };
}

// Mirrors ngo.service.ts's resubmitProfile — a rejected nursery edits its details, then
// explicitly resubmits for another review pass rather than a PATCH silently reopening it.
export async function resubmitProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'rejected') throw new ForbiddenError('Only a rejected application can be resubmitted');

  return prisma.nurseryProfile.update({
    where: { id: profile.id },
    data: { status: 'pending', rejectionReason: null, approvedAt: null, approvedByUserId: null },
  });
}

export async function requireApprovedNurseryProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'approved') throw new ForbiddenError('Your nursery account is not yet approved');
  return profile;
}

export async function getOwnStats(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  // Counted/summed in SQL (all rows, archived included, as before) instead of loading every row.
  const totals = await cached(nurseryKey(profile.id, 'stockTotals'), STATS_TTL_MS, async () => {
    const [agg, free] = await Promise.all([
      prisma.saplingStock.aggregate({ where: { nurseryId: profile.id }, _count: { _all: true }, _sum: { quantity: true } }),
      prisma.saplingStock.count({ where: { nurseryId: profile.id, isFree: true } }),
    ]);
    return { speciesCount: agg._count._all, totalQuantity: agg._sum.quantity ?? 0, freeSpeciesCount: free };
  });

  return {
    ...totals,
    trustScore: profile.trustScore,
    growthLevel: profile.growthLevel,
    badgesCount: profile.badgesCount,
  };
}

interface StockFilter {
  q?: string;
  archived?: boolean;
  sort?: 'newest' | 'oldest' | 'name' | 'quantity' | 'price';
  species?: string;
  native?: boolean;
  availability?: 'available' | 'low_stock' | 'out_of_stock';
  season?: string;
}

function deriveAvailability(quantity: number, lowStockThreshold: number): 'available' | 'low_stock' | 'out_of_stock' {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= lowStockThreshold) return 'low_stock';
  return 'available';
}

function withAvailability<T extends { quantity: number; lowStockThreshold: number }>(item: T) {
  return { ...item, availabilityStatus: deriveAvailability(item.quantity, item.lowStockThreshold) };
}

export async function listStock(prisma: PrismaClient, userId: string, filter: StockFilter & CursorQuery = {}) {
  const profile = await getOwnProfile(prisma, userId);
  const { take, args } = cursorArgs(filter);

  // Availability compares two columns (quantity vs. its own low-stock threshold), which Prisma's
  // `where` can't express – so the matching ids come from SQL and the page itself stays exact.
  let availabilityIds: string[] | undefined;
  if (filter.availability) {
    const cond =
      filter.availability === 'out_of_stock'
        ? Prisma.sql`quantity <= 0`
        : filter.availability === 'low_stock'
          ? Prisma.sql`quantity > 0 AND quantity <= low_stock_threshold`
          : Prisma.sql`quantity > low_stock_threshold`;
    const archivedCond = filter.archived ? Prisma.sql`archived_at IS NOT NULL` : Prisma.sql`archived_at IS NULL`;
    const matches = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM sapling_stock WHERE nursery_id = ${profile.id} AND ${archivedCond} AND ${cond}`,
    );
    availabilityIds = matches.map((m) => m.id);
  }

  const speciesRefFilter = {
    ...(filter.native !== undefined ? { isNative: filter.native } : {}),
    ...(filter.season ? { plantingSeasons: { has: filter.season } } : {}),
  };

  const orderBy: Prisma.SaplingStockOrderByWithRelationInput[] =
    filter.sort === 'oldest'
      ? [{ createdAt: 'asc' }, { id: 'asc' }]
      : filter.sort === 'name'
        ? [{ species: 'asc' }, { id: 'asc' }]
        : filter.sort === 'quantity'
          ? [{ quantity: 'asc' }, { id: 'asc' }]
          : filter.sort === 'price'
            ? [{ priceCents: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }];

  const fetched = await prisma.saplingStock.findMany({
    where: {
      nurseryId: profile.id,
      archivedAt: filter.archived ? { not: null } : null,
      ...(availabilityIds ? { id: { in: availabilityIds } } : {}),
      ...(filter.species ? { species: { contains: filter.species, mode: 'insensitive' } } : {}),
      ...(Object.keys(speciesRefFilter).length ? { speciesRef: speciesRefFilter } : {}),
      ...(filter.q
        ? {
            OR: [
              { species: { contains: filter.q, mode: 'insensitive' } },
              { scientificNameSnap: { contains: filter.q, mode: 'insensitive' } },
              { ageLabel: { contains: filter.q, mode: 'insensitive' } },
              { potSize: { contains: filter.q, mode: 'insensitive' } },
              { nurseryNotes: { contains: filter.q, mode: 'insensitive' } },
              { speciesRef: { commonName: { contains: filter.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { speciesRef: true },
    orderBy,
    ...args,
  });
  const hasMore = fetched.length > take;
  const rows = hasMore ? fetched.slice(0, take) : fetched;
  return { items: rows.map(withAvailability), nextCursor: hasMore ? rows[rows.length - 1].id : null };
}

export async function createStock(prisma: PrismaClient, userId: string, input: StockInput) {
  const profile = await getOwnProfile(prisma, userId);
  const { speciesId, speciesDisplayName } = await resolveSpeciesLink(prisma, input);
  if (!speciesDisplayName) throw new BadRequestError('Provide either speciesId or species details');

  const { species: _species, speciesId: _speciesId, ...rest } = input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.saplingStock.create({
      data: { ...rest, nurseryId: profile.id, species: speciesDisplayName, speciesId },
    });
    if (item.quantity > 0) {
      await tx.saplingStockLedger.create({
        data: {
          nurseryId: profile.id,
          stockId: item.id,
          species: item.species,
          delta: item.quantity,
          reason: 'manual_add',
        },
      });
    }
    await recordNurseryContribution(tx, profile.id, ['inventory_freshness', 'arth_contribution']);
    await evaluateNurseryAchievements(tx, profile.id);
    await recomputeReputation(tx, profile.id);
    invalidateNurseryCache(profile.id);
    return withAvailability(item);
  });
}

/**
 * Low/out-of-stock nudge for stock that dropped outside the inventory screen (a marketplace order,
 * a fulfilled reservation, a bulk-requirement supply). Call it after the writing transaction has
 * committed, with the quantity the item had *before* the change; it re-reads the row and notifies
 * the nursery only when the item crossed into the low-stock or out-of-stock band, same
 * "don't spam every change" rule as updateStock. Never throws - an alert failing must not undo or
 * fail the sale that caused it.
 */
export async function alertOnStockBandChange(prisma: PrismaClient, stockId: string, quantityBefore: number) {
  try {
    // Every caller has just changed this item's quantity outside the inventory screen.
    const owner = await prisma.saplingStock.findUnique({ where: { id: stockId }, select: { nurseryId: true } });
    if (owner) invalidateNurseryCache(owner.nurseryId);

    const stock = await prisma.saplingStock.findUnique({
      where: { id: stockId },
      include: { nursery: { select: { userId: true } } },
    });
    if (!stock) return;
    const was = deriveAvailability(quantityBefore, stock.lowStockThreshold);
    const now = deriveAvailability(stock.quantity, stock.lowStockThreshold);
    if (now === was || now === 'available') return;
    const type = now === 'out_of_stock' ? 'stock_out_of_stock' : 'stock_low';
    await notify(prisma, {
      userId: stock.nursery.userId,
      type,
      data: { stockId, species: stock.species, quantity: stock.quantity },
      push:
        type === 'stock_out_of_stock'
          ? { title: 'Out of stock', body: `${stock.species} just ran out - update it once you restock.` }
          : { title: 'Running low', body: `${stock.species} is down to ${stock.quantity} - restock soon.` },
    });
  } catch {
    // best-effort
  }
}

export async function updateStock(prisma: PrismaClient, userId: string, stockId: string, input: Partial<StockInput>) {
  const profile = await getOwnProfile(prisma, userId);
  const { speciesId, speciesDisplayName } = await resolveSpeciesLink(prisma, input);
  const { species: _species, ...rest } = input;

  const { updated, wishlisterIds, stockAlert } = await prisma.$transaction(async (tx) => {
    const existing = await tx.saplingStock.findFirst({ where: { id: stockId, nurseryId: profile.id } });
    if (!existing) throw new NotFoundError('Stock item not found');

    const updated = await tx.saplingStock.update({
      where: { id: stockId },
      data: { ...rest, ...(speciesId ? { speciesId, species: speciesDisplayName } : {}) },
    });

    if (input.quantity !== undefined && input.quantity !== existing.quantity) {
      await tx.saplingStockLedger.create({
        data: {
          nurseryId: profile.id,
          stockId: updated.id,
          species: updated.species,
          delta: input.quantity - existing.quantity,
          reason: 'manual_adjust',
        },
      });
      await recordNurseryContribution(tx, profile.id, ['inventory_freshness', 'arth_contribution']);
    }
    await evaluateNurseryAchievements(tx, profile.id);
    await recomputeReputation(tx, profile.id);

    // Back-in-stock: only fires on the 0 -> positive transition, never on every restock bump, so
    // wishlisting a perpetually-low-stock item doesn't spam the wishlister daily. Notifications are
    // sent after the transaction commits (see reservation.service.ts's pattern), not inside it.
    let wishlisterIds: string[] = [];
    if (existing.quantity <= 0 && updated.quantity > 0) {
      const wishlisters = await tx.wishlistItem.findMany({ where: { stockId }, select: { userId: true } });
      wishlisterIds = wishlisters.map((w) => w.userId);
    }

    // Self-targeted low-stock/out-of-stock nudge (section 1/11) — fires only on the band-crossing
    // transition, same "don't spam every bump" reasoning as the wishlist notify above.
    const threshold = updated.lowStockThreshold;
    const wasAvailability = deriveAvailability(existing.quantity, existing.lowStockThreshold);
    const nowAvailability = deriveAvailability(updated.quantity, threshold);
    let stockAlert: 'stock_low' | 'stock_out_of_stock' | null = null;
    if (nowAvailability !== wasAvailability && (nowAvailability === 'low_stock' || nowAvailability === 'out_of_stock')) {
      stockAlert = nowAvailability === 'out_of_stock' ? 'stock_out_of_stock' : 'stock_low';
    }

    return { updated, wishlisterIds, stockAlert };
  });
  invalidateNurseryCache(profile.id);

  for (const wishlisterId of wishlisterIds) {
    await notify(prisma, {
      userId: wishlisterId,
      type: 'wishlist_back_in_stock',
      data: { stockId, species: updated.species, nurseryName: profile.nurseryName },
      push: { title: `${updated.species} is back in stock!`, body: `${profile.nurseryName} just restocked ${updated.species}.` },
    });
  }

  if (stockAlert) {
    await notify(prisma, {
      userId,
      type: stockAlert,
      data: { stockId, species: updated.species, quantity: updated.quantity },
      push:
        stockAlert === 'stock_out_of_stock'
          ? { title: 'Out of stock', body: `${updated.species} just ran out — update it once you restock.` }
          : { title: 'Running low', body: `${updated.species} is down to ${updated.quantity} — restock soon.` },
    });
  }

  return withAvailability(updated);
}

/** Nursery responds to a review left on one of their orders — calling this again on a review
 * that already has a response edits it in place (nurseryRespondedAt moves to the edit time). */
export async function respondToReview(prisma: PrismaClient, userId: string, reviewId: string, response: string) {
  const profile = await getOwnProfile(prisma, userId);
  const review = await prisma.orderReview.findFirst({ where: { id: reviewId, nurseryId: profile.id } });
  if (!review) throw new NotFoundError('Review not found');

  return prisma.orderReview.update({
    where: { id: reviewId },
    data: { nurseryResponse: response, nurseryRespondedAt: new Date() },
  });
}

export async function listReviews(prisma: PrismaClient, userId: string, q: CursorQuery = {}) {
  const profile = await getOwnProfile(prisma, userId);
  const { take, args } = cursorArgs(q);
  const rows = await prisma.orderReview.findMany({
    where: { nurseryId: profile.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { user: { select: { id: true, name: true, avatarEmoji: true } } },
    ...args,
  });
  return toCursorPage(rows, take);
}

export async function deleteStock(prisma: PrismaClient, userId: string, stockId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const result = await prisma.saplingStock.deleteMany({ where: { id: stockId, nurseryId: profile.id } });
  if (result.count === 0) throw new NotFoundError('Stock item not found');
  invalidateNurseryCache(profile.id);
}

/** Distinct species names across this nursery's stock - feeds filter dropdowns (e.g. Reports)
 * without the client having to page through the whole catalogue to build the list. */
export async function listStockSpeciesOptions(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return cached(nurseryKey(profile.id, 'speciesOptions'), 60_000, async () => {
    const rows = await prisma.saplingStock.findMany({
      where: { nurseryId: profile.id },
      select: { species: true },
      distinct: ['species'],
      orderBy: { species: 'asc' },
      take: 500,
    });
    return rows.map((r) => r.species);
  });
}

// ---------- Reputation (contribution streaks, Growth Level, ARTH Trust Score) ----------

export async function getOwnReputationSummary(prisma: PrismaClient, userId: string, weeksCount = 12) {
  const profile = await getOwnProfile(prisma, userId);
  // Counts over orders/streaks/units per call; a short cache absorbs the app's polling.
  return cached(nurseryKey(profile.id, 'reputation', String(weeksCount)), IMPACT_TTL_MS, () =>
    getReputationSummary(prisma, profile.id, weeksCount),
  );
}

// ---------- Badges ----------

export async function getBadges(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return getPublicBadges(prisma, profile.id);
}

export async function getPublicBadges(prisma: PrismaClient, nurseryId: string) {
  const achievements = await prisma.nurseryAchievement.findMany({ orderBy: { sortOrder: 'asc' } });
  const unlocks = await prisma.nurseryAchievementUnlock.findMany({ where: { nurseryId } });
  const unlockById = new Map(unlocks.map((u) => [u.achievementId, u]));

  return achievements.map((a) => {
    const unlock = unlockById.get(a.id);
    return {
      id: a.id,
      key: a.key,
      title: a.title,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      criteriaTarget: a.criteriaTarget,
      progress: unlock?.progress ?? 0,
      unlocked: unlock?.unlocked ?? false,
      unlockedAt: unlock?.unlockedAt ?? null,
    };
  });
}

// ---------- Reservations (nursery-side inbox) ----------

export async function listReservations(prisma: PrismaClient, userId: string, status?: string, q: CursorQuery = {}) {
  const profile = await getOwnProfile(prisma, userId);
  const { take, args } = cursorArgs(q);
  const rows = await prisma.saplingReservation.findMany({
    where: {
      nurseryId: profile.id,
      // `responded` = everything that is no longer pending (the app's History tab).
      ...(status === 'responded' ? { status: { not: 'pending' as const } } : status ? { status: status as any } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { stock: { select: { species: true } }, user: { select: { id: true, name: true, avatarEmoji: true } } },
    ...args,
  });
  return toCursorPage(rows, take);
}

export async function fulfillReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const profile = await getOwnProfile(prisma, userId);

  let stockBefore: { stockId: string; quantity: number } | null = null;
  const updated = await prisma.$transaction(async (tx) => {
    const reservation = await tx.saplingReservation.findFirst({
      where: { id: reservationId, nurseryId: profile.id },
      include: { stock: true },
    });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== 'pending') throw new BadRequestError('This reservation has already been responded to');
    stockBefore = { stockId: reservation.stockId, quantity: reservation.stock.quantity };

    // A reservation request is only ever checked against stock at the moment it's made
    // (createReservation) — by the time a nursery gets around to fulfilling it, another
    // reservation or a marketplace sale may have already taken some of that stock. Clamping the
    // decrement to whatever's actually on hand while still logging (and marking "fulfilled") the
    // full requested amount would leave the stock ledger and physical stock permanently
    // disagreeing, so this refuses instead — same shape as the bulk-requirement stock gate.
    const decremented = await tx.saplingStock.updateMany({
      where: { id: reservation.stockId, quantity: { gte: reservation.quantity } },
      data: { quantity: { decrement: reservation.quantity } },
    });
    if (decremented.count === 0) {
      throw new BadRequestError(
        `You only have ${reservation.stock.quantity} ${reservation.stock.species} in stock, but this reservation is for ${reservation.quantity}. Add more stock first, or decline the reservation.`,
      );
    }

    await tx.saplingStockLedger.create({
      data: {
        nurseryId: profile.id,
        stockId: reservation.stockId,
        species: reservation.stock.species,
        delta: -reservation.quantity,
        reason: 'reservation_fulfilled',
      },
    });

    const result = await tx.saplingReservation.update({
      where: { id: reservationId },
      data: { status: 'fulfilled', respondedAt: new Date() },
    });

    await recordNurseryContribution(tx, profile.id, ['arth_contribution']);
    await evaluateNurseryAchievements(tx, profile.id);
    await recomputeReputation(tx, profile.id);

    return { ...result, species: reservation.stock.species, quantity: reservation.quantity };
  });

  if (stockBefore) await alertOnStockBandChange(prisma, (stockBefore as { stockId: string }).stockId, (stockBefore as { quantity: number }).quantity);

  await notify(prisma, {
    userId: updated.userId,
    type: 'reservation_fulfilled',
    actorUserId: userId,
    data: { species: updated.species, quantity: updated.quantity, nurseryName: profile.nurseryName },
    push: { title: profile.nurseryName, body: `Your request for ${updated.species} saplings was fulfilled!` },
  });

  return updated;
}

export async function declineReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const reservation = await prisma.saplingReservation.findFirst({
    where: { id: reservationId, nurseryId: profile.id },
    include: { stock: true },
  });
  if (!reservation) throw new NotFoundError('Reservation not found');
  if (reservation.status !== 'pending') throw new BadRequestError('This reservation has already been responded to');

  const updated = await prisma.saplingReservation.update({
    where: { id: reservationId },
    data: { status: 'declined', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: reservation.userId,
    type: 'reservation_declined',
    actorUserId: userId,
    data: { species: reservation.stock.species, quantity: reservation.quantity, nurseryName: profile.nurseryName },
    push: { title: profile.nurseryName, body: `Your request for ${reservation.stock.species} saplings was declined.` },
  });

  return updated;
}

// ---------- Stock ledger / analytics ----------

const LEDGER_REASONS = [
  'manual_add',
  'manual_adjust',
  'manual_remove',
  'reservation_fulfilled',
  'order_placed',
  'order_cancelled',
  'bulk_requirement_fulfilled',
] as const;

/** `reasons` narrows the ledger to specific movements - the analytics cards use it to list exactly
 * the rows that add up to their number. Unknown reason names are ignored. */
export async function getStockLedger(prisma: PrismaClient, userId: string, page = 1, take = 30, reasons: string[] = []) {
  const profile = await getOwnProfile(prisma, userId);
  const capped = Math.min(take, 50);
  const wanted = reasons.filter((r): r is (typeof LEDGER_REASONS)[number] => (LEDGER_REASONS as readonly string[]).includes(r));
  return prisma.saplingStockLedger.findMany({
    where: { nurseryId: profile.id, ...(wanted.length > 0 ? { reason: { in: wanted } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: capped,
    skip: (Math.max(page, 1) - 1) * capped,
  });
}

/** Cursor-paged ledger (the web dashboard still uses the offset form above). `direction` narrows to
 * additions (`in`, delta > 0) or removals (`out`, delta < 0) so the analytics sheets don't have to
 * filter a partial page client-side. */
export async function listStockLedger(
  prisma: PrismaClient,
  userId: string,
  q: CursorQuery & { reasons?: string[]; direction?: 'in' | 'out' } = {},
) {
  const profile = await getOwnProfile(prisma, userId);
  const { take, args } = cursorArgs(q, 30);
  const wanted = (q.reasons ?? []).filter((r): r is (typeof LEDGER_REASONS)[number] => (LEDGER_REASONS as readonly string[]).includes(r));
  const rows = await prisma.saplingStockLedger.findMany({
    where: {
      nurseryId: profile.id,
      ...(wanted.length > 0 ? { reason: { in: wanted } } : {}),
      ...(q.direction === 'in' ? { delta: { gt: 0 } } : q.direction === 'out' ? { delta: { lt: 0 } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...args,
  });
  return toCursorPage(rows, take);
}

// ---------- Dashboard (section 1) ----------
// Purpose-built aggregation, not a bolt-on to getOwnStats above — the dashboard needs
// order-status counts and ArthSaplingUnit/BulkRequirement joins getOwnStats doesn't touch.
export async function getDashboardSummary(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return cached(nurseryKey(profile.id, 'dashboard'), STATS_TTL_MS, () => computeDashboardSummary(prisma, userId, profile));
}

async function computeDashboardSummary(prisma: PrismaClient, userId: string, profile: Awaited<ReturnType<typeof getOwnProfile>>) {
  const todayStart = startOfUtcDay(new Date());

  const [
    ordersToday,
    newPending,
    readyForPickupCount,
    deliveriesPendingCount,
    lowStockRows,
    saplingsSuppliedLifetime,
    verifiedPlantations,
    revenueAgg,
    upcomingRequirements,
    activityNotifications,
  ] = await Promise.all([
    prisma.order.count({ where: { nurseryId: profile.id, createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { nurseryId: profile.id, status: 'confirmed' } }),
    prisma.order.count({ where: { nurseryId: profile.id, status: 'ready_for_pickup' } }),
    prisma.order.count({ where: { nurseryId: profile.id, status: 'out_for_delivery' } }),
    // Only the rows that actually need attention, filtered in SQL, not the whole catalogue.
    prisma.$queryRaw<{ id: string; species: string; quantity: number; low_stock_threshold: number }[]>(
      Prisma.sql`SELECT id, species, quantity, low_stock_threshold FROM sapling_stock
        WHERE nursery_id = ${profile.id} AND archived_at IS NULL AND quantity <= low_stock_threshold
        ORDER BY quantity ASC, species ASC LIMIT 50`,
    ),
    prisma.arthSaplingUnit.count({ where: { nurseryId: profile.id, status: { in: ['collected', 'planted'] } } }),
    prisma.tree.count({ where: { nurseryId: profile.id, aiVerificationStatus: 'verified' } }),
    prisma.order.aggregate({
      where: { nurseryId: profile.id, status: { notIn: ['pending_payment', 'cancelled'] } },
      _sum: { totalCents: true },
    }),
    prisma.bulkRequirement.findMany({
      where: {
        status: { in: ['open', 'partially_fulfilled'] },
        ...(profile.city ? { city: profile.city } : {}),
      },
      orderBy: { neededByDate: 'asc' },
      take: 5,
      include: { ngo: { select: { orgName: true } }, species: { select: { commonName: true } } },
    }),
    prisma.notification.findMany({
      where: {
        userId,
        type: {
          in: [
            'order_placed',
            'order_picked_up',
            'order_delivered',
            'sapling_planted',
            'stock_low',
            'stock_out_of_stock',
            'bulk_requirement_nearby',
            'nursery_tree_milestone',
            'nursery_impact_milestone',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const lowStock = lowStockRows.map((r) => withAvailability({ id: r.id, species: r.species, quantity: r.quantity, lowStockThreshold: r.low_stock_threshold }));

  return {
    ordersToday,
    newPending,
    readyForPickup: readyForPickupCount,
    deliveriesPending: deliveriesPendingCount,
    trustScore: profile.trustScore,
    growthLevel: profile.growthLevel,
    lowStockSpecies: lowStock.map((s) => ({ id: s.id, species: s.species, quantity: s.quantity, availabilityStatus: s.availabilityStatus })),
    saplingsSuppliedLifetime,
    verifiedPlantations,
    revenueViaArthCents: revenueAgg._sum.totalCents ?? 0,
    upcomingBulkRequirements: upcomingRequirements.map((r) => ({
      id: r.id,
      ngoName: r.ngo.orgName,
      species: r.species?.commonName ?? r.speciesNote,
      quantityNeeded: r.quantityNeeded,
      quantityFulfilled: r.quantityFulfilled,
      neededByDate: r.neededByDate,
      city: r.city,
    })),
    activity: activityNotifications.map((n) => ({ id: n.id, type: n.type, data: n.data, createdAt: n.createdAt })),
  };
}

// ---------- Impact (section 7) ----------
export async function getImpact(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return cached(nurseryKey(profile.id, 'impact'), IMPACT_TTL_MS, () => computeImpact(prisma, profile.id));
}

// Everything below is counted/grouped in SQL; nothing loads a row per sapling, order or response.
async function computeImpact(prisma: PrismaClient, nurseryId: string) {
  const since = addDays(startOfUtcDay(new Date()), -180);

  const [treesGrowingThroughYou, plantedCount, verifiedPlantedCount, speciesCount, impactTotals, drivesRow, trendRows] = await Promise.all([
    prisma.tree.count({ where: { nurseryId, aiVerificationStatus: 'verified' } }),
    prisma.arthSaplingUnit.count({ where: { nurseryId, status: 'planted' } }),
    prisma.arthSaplingUnit.count({ where: { nurseryId, status: 'planted', tree: { aiVerificationStatus: 'verified' } } }),
    prisma.saplingStock.count({ where: { nurseryId } }),
    getNurseryImpactTotals(prisma, nurseryId),
    prisma.$queryRaw<{ n: bigint }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT r.drive_id) AS n
        FROM bulk_requirement_responses resp
        JOIN bulk_requirements r ON r.id = resp.requirement_id
        WHERE resp.nursery_id = ${nurseryId} AND resp.status = 'fulfilled' AND r.drive_id IS NOT NULL`,
    ),
    prisma.$queryRaw<{ month: string; n: bigint }[]>(
      Prisma.sql`SELECT to_char(supply_date, 'YYYY-MM') AS month, COUNT(*) AS n
        FROM arth_sapling_units
        WHERE nursery_id = ${nurseryId} AND supply_date >= ${since}
        GROUP BY 1 ORDER BY 1`,
    ),
  ]);

  const verificationPercentage = plantedCount > 0 ? Math.round((verifiedPlantedCount / plantedCount) * 100) : 0;
  const ngoDrivesSupported = Number(drivesRow[0]?.n ?? 0);
  const monthlyTrend = new Map<string, number>(trendRows.map((r) => [r.month, Number(r.n)]));

  return {
    treesGrowingThroughYou,
    totalSaplingsSupplied: plantedCount,
    verificationPercentage,
    speciesCount,
    ngoDrivesSupported,
    // Estimated from each tree's species and age (lib/treeImpact.ts), for verified, living trees.
    estimatedCo2Kg: impactTotals.co2Kg,
    estimatedOxygenKg: impactTotals.oxygenKg,
    impactConfidence: impactTotals.confidence,
    monthlyTrend: Array.from(monthlyTrend.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
  };
}

export async function getStockAnalytics(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const [addedAgg, givenOutAgg, cancelledAgg, reservationsDone, bulkResponsesDone, stats] = await Promise.all([
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: { in: ['manual_add', 'manual_adjust'] }, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    // 'reservation_fulfilled' was the only outflow reason counted here — the primary sales
    // channel (regular cart/checkout purchases, 'order_placed') and bulk-requirement fulfilment
    // were both invisible, so a nursery selling exclusively through the storefront saw "Given
    // out: 0" forever regardless of actual sales volume.
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: { in: ['reservation_fulfilled', 'order_placed', 'bulk_requirement_fulfilled'] } },
      _sum: { delta: true },
    }),
    // Netted out below so a cancelled/refunded order's restock doesn't still count toward
    // "given out" just because its original order_placed row does.
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: 'order_cancelled' },
      _sum: { delta: true },
    }),
    prisma.saplingReservation.count({ where: { nurseryId: profile.id, status: 'fulfilled' } }),
    // An NGO bulk requirement the nursery supplied (receipt confirmed) is a fulfilled request too -
    // counting reservations alone left "Requests fulfilled" at 0 for a nursery whose work all came
    // through bulk requirements.
    prisma.bulkRequirementResponse.count({ where: { nurseryId: profile.id, status: 'fulfilled' } }),
    getOwnStats(prisma, userId),
  ]);

  return {
    totalAddedLifetime: addedAgg._sum.delta ?? 0,
    totalGivenOutLifetime: Math.max(0, Math.abs(givenOutAgg._sum.delta ?? 0) - (cancelledAgg._sum.delta ?? 0)),
    reservationsFulfilled: reservationsDone + bulkResponsesDone,
    currentSpeciesCount: stats.speciesCount,
    currentTotalQuantity: stats.totalQuantity,
  };
}

/** Header numbers for the stock list (non-archived), plus how many are archived. */
export async function getStockSummary(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return cached(nurseryKey(profile.id, 'stockSummary'), STATS_TTL_MS, async () => {
    // One SQL pass; the availability bands mirror deriveAvailability above.
    const [counts, archived] = await Promise.all([
      prisma.$queryRaw<{ total: bigint; available: bigint; low: bigint; out: bigint; saplings: bigint | null }[]>(
        Prisma.sql`SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE quantity > low_stock_threshold) AS available,
            COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= low_stock_threshold) AS low,
            COUNT(*) FILTER (WHERE quantity <= 0) AS out,
            COALESCE(SUM(GREATEST(quantity, 0)), 0) AS saplings
          FROM sapling_stock WHERE nursery_id = ${profile.id} AND archived_at IS NULL`,
      ),
      prisma.saplingStock.count({ where: { nurseryId: profile.id, archivedAt: { not: null } } }),
    ]);
    const c = counts[0];
    const low = Number(c?.low ?? 0);
    const out = Number(c?.out ?? 0);
    return {
      total: Number(c?.total ?? 0),
      available: Number(c?.available ?? 0),
      low_stock: low,
      out_of_stock: out,
      saplings: Number(c?.saplings ?? 0),
      archived,
      needsAttention: low + out,
    };
  });
}

export async function setStockArchived(prisma: PrismaClient, userId: string, stockId: string, archived: boolean) {
  const profile = await getOwnProfile(prisma, userId);
  const result = await prisma.saplingStock.updateMany({
    where: { id: stockId, nurseryId: profile.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  if (result.count === 0) throw new NotFoundError('Stock item not found');
  invalidateNurseryCache(profile.id);
  return { id: stockId, archived };
}

export async function exportStock(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  // Hard cap so one huge catalogue can't pull an unbounded result into memory for the CSV.
  const items = await prisma.saplingStock.findMany({ where: { nurseryId: profile.id }, orderBy: { species: 'asc' }, take: 10000 });
  return items.map((i) => ({
    species: i.species,
    quantity: i.quantity,
    availability: i.archivedAt ? 'archived' : deriveAvailability(i.quantity, i.lowStockThreshold),
    lowStockThreshold: i.lowStockThreshold,
    priceRupees: i.isFree ? 'free' : i.priceCents != null ? i.priceCents / 100 : '',
    age: i.ageLabel ?? '',
    height: i.heightLabel ?? '',
    potSize: i.potSize ?? '',
    notes: i.nurseryNotes ?? '',
    addedOn: i.createdAt.toISOString(),
  }));
}
