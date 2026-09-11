import { Prisma, PrismaClient } from '@plant/db';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { notify } from './notification.service';
import { recordNurseryActiveToday } from './nurseryStreak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { startOfUtcDay, addDays } from './streak.service';

interface UpdateProfileInput {
  nurseryName?: string;
  description?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
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

  return prisma.nurseryProfile.update({
    where: { id: profile.id },
    data: input as Prisma.NurseryProfileUpdateInput,
  });
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

  const existing = await prisma.treeSpecies.findFirst({
    where: { commonName: { equals: commonName, mode: 'insensitive' } },
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
  const stock = await prisma.saplingStock.findMany({ where: { nurseryId: profile.id } });

  return {
    speciesCount: stock.length,
    totalQuantity: stock.reduce((sum, s) => sum + s.quantity, 0),
    freeSpeciesCount: stock.filter((s) => s.isFree).length,
    streakCurrent: profile.streakCurrent,
    streakMax: profile.streakMax,
    badgesCount: profile.badgesCount,
  };
}

interface StockFilter {
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

export async function listStock(prisma: PrismaClient, userId: string, filter: StockFilter = {}) {
  const profile = await getOwnProfile(prisma, userId);
  const rows = await prisma.saplingStock.findMany({
    where: {
      nurseryId: profile.id,
      ...(filter.species ? { species: { contains: filter.species, mode: 'insensitive' } } : {}),
      ...(filter.native !== undefined ? { speciesRef: { isNative: filter.native } } : {}),
      ...(filter.season ? { speciesRef: { plantingSeasons: { has: filter.season } } } : {}),
    },
    include: { speciesRef: true },
    orderBy: { createdAt: 'desc' },
  });
  const withStatus = rows.map(withAvailability);
  return filter.availability ? withStatus.filter((r) => r.availabilityStatus === filter.availability) : withStatus;
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
    await recordNurseryActiveToday(tx, profile.id);
    return withAvailability(item);
  });
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
      await recordNurseryActiveToday(tx, profile.id);
    }

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

/** Nursery responds once to a review left on one of their orders. */
export async function respondToReview(prisma: PrismaClient, userId: string, reviewId: string, response: string) {
  const profile = await getOwnProfile(prisma, userId);
  const review = await prisma.orderReview.findFirst({ where: { id: reviewId, nurseryId: profile.id } });
  if (!review) throw new NotFoundError('Review not found');
  if (review.nurseryResponse) throw new BadRequestError('You already responded to this review');

  return prisma.orderReview.update({
    where: { id: reviewId },
    data: { nurseryResponse: response, nurseryRespondedAt: new Date() },
  });
}

export async function listReviews(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.orderReview.findMany({
    where: { nurseryId: profile.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarEmoji: true } } },
  });
}

export async function deleteStock(prisma: PrismaClient, userId: string, stockId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const result = await prisma.saplingStock.deleteMany({ where: { id: stockId, nurseryId: profile.id } });
  if (result.count === 0) throw new NotFoundError('Stock item not found');
}

// ---------- Streak calendar ----------

export async function getStreakCalendar(prisma: PrismaClient, userId: string, weeksCount: number) {
  const profile = await getOwnProfile(prisma, userId);
  const today = startOfUtcDay(new Date());
  const startDate = addDays(today, -(weeksCount * 7 - 1));

  const rows = await prisma.nurseryStreakHistory.findMany({
    where: { nurseryId: profile.id, activityDate: { gte: startDate } },
  });
  const plantedDates = new Set(rows.filter((r) => r.planted).map((r) => r.activityDate.toISOString().slice(0, 10)));

  const weeks = [];
  for (let w = 0; w < weeksCount; w++) {
    const days: boolean[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      days.push(plantedDates.has(date.toISOString().slice(0, 10)));
    }
    weeks.push({ week: `Week ${w + 1}`, days });
  }
  return weeks;
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

export async function listReservations(prisma: PrismaClient, userId: string, status?: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.saplingReservation.findMany({
    where: { nurseryId: profile.id, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { stock: { select: { species: true } }, user: { select: { id: true, name: true, avatarEmoji: true } } },
  });
}

export async function fulfillReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const updated = await prisma.$transaction(async (tx) => {
    const reservation = await tx.saplingReservation.findFirst({
      where: { id: reservationId, nurseryId: profile.id },
      include: { stock: true },
    });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== 'pending') throw new BadRequestError('This reservation has already been responded to');

    const newQuantity = Math.max(0, reservation.stock.quantity - reservation.quantity);
    await tx.saplingStock.update({ where: { id: reservation.stockId }, data: { quantity: newQuantity } });

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

    await recordNurseryActiveToday(tx, profile.id);
    await evaluateNurseryAchievements(tx, profile.id);

    return { ...result, species: reservation.stock.species, quantity: reservation.quantity };
  });

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

export async function getStockLedger(prisma: PrismaClient, userId: string, page = 1, take = 30) {
  const profile = await getOwnProfile(prisma, userId);
  const capped = Math.min(take, 50);
  return prisma.saplingStockLedger.findMany({
    where: { nurseryId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: capped,
    skip: (Math.max(page, 1) - 1) * capped,
  });
}

// ---------- Dashboard (section 1) ----------
// Purpose-built aggregation, not a bolt-on to getOwnStats above — the dashboard needs
// order-status counts and ArthSaplingUnit/BulkRequirement joins getOwnStats doesn't touch.
export async function getDashboardSummary(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
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
    prisma.saplingStock.findMany({ where: { nurseryId: profile.id } }),
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

  const lowStock = lowStockRows.map(withAvailability).filter((r) => r.availabilityStatus !== 'available');

  return {
    ordersToday,
    newPending,
    readyForPickup: readyForPickupCount,
    deliveriesPending: deliveriesPendingCount,
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

  const [treesGrowingThroughYou, plantedUnits, speciesCount, co2Agg, fulfilledResponses, sixMonthUnits] = await Promise.all([
    prisma.tree.count({ where: { nurseryId: profile.id, aiVerificationStatus: 'verified' } }),
    prisma.arthSaplingUnit.findMany({
      where: { nurseryId: profile.id, status: 'planted' },
      include: { tree: { select: { aiVerificationStatus: true } } },
    }),
    prisma.saplingStock.count({ where: { nurseryId: profile.id } }),
    prisma.tree.aggregate({ where: { nurseryId: profile.id }, _sum: { co2Absorbed: true } }),
    prisma.bulkRequirementResponse.findMany({
      where: { nurseryId: profile.id, status: 'fulfilled' },
      include: { requirement: { select: { ngoId: true, driveId: true } } },
    }),
    prisma.arthSaplingUnit.findMany({
      where: { nurseryId: profile.id, supplyDate: { gte: addDays(startOfUtcDay(new Date()), -180) } },
      select: { supplyDate: true },
    }),
  ]);

  const verifiedPlantedUnits = plantedUnits.filter((u) => u.tree?.aiVerificationStatus === 'verified').length;
  const verificationPercentage = plantedUnits.length > 0 ? Math.round((verifiedPlantedUnits / plantedUnits.length) * 100) : 0;
  const ngoDrivesSupported = new Set(fulfilledResponses.map((r) => r.requirement.driveId).filter(Boolean)).size;

  const monthlyTrend = new Map<string, number>();
  for (const unit of sixMonthUnits) {
    const key = unit.supplyDate.toISOString().slice(0, 7); // YYYY-MM
    monthlyTrend.set(key, (monthlyTrend.get(key) ?? 0) + 1);
  }

  return {
    treesGrowingThroughYou,
    totalSaplingsSupplied: plantedUnits.length,
    verificationPercentage,
    speciesCount,
    ngoDrivesSupported,
    estimatedCo2Kg: Number(co2Agg._sum.co2Absorbed ?? 0),
    monthlyTrend: Array.from(monthlyTrend.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
  };
}

export async function getStockAnalytics(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const [addedAgg, givenOutAgg, reservationsFulfilled, stats] = await Promise.all([
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: { in: ['manual_add', 'manual_adjust'] }, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: 'reservation_fulfilled' },
      _sum: { delta: true },
    }),
    prisma.saplingReservation.count({ where: { nurseryId: profile.id, status: 'fulfilled' } }),
    getOwnStats(prisma, userId),
  ]);

  return {
    totalAddedLifetime: addedAgg._sum.delta ?? 0,
    totalGivenOutLifetime: Math.abs(givenOutAgg._sum.delta ?? 0),
    reservationsFulfilled,
    currentSpeciesCount: stats.speciesCount,
    currentTotalQuantity: stats.totalQuantity,
  };
}
