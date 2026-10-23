import { PrismaClient } from '@arth/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notification.service';
import { alertOnStockBandChange } from './nursery.service';
import { requireApprovedNgoProfile } from './ngo.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { recordNurseryContribution, recomputeReputation } from './nurseryReputation.service';
import { haversineDistanceKm } from '../utils/geo';
import { cursorArgs, toCursorPage, parseTake, type CursorQuery } from '../utils/pagination';

const NEARBY_FANOUT_RADIUS_KM = 25;

interface CreateRequirementInput {
  driveId?: string;
  speciesId?: string;
  speciesNote?: string;
  nativePreferred?: boolean;
  quantityNeeded: number;
  neededByDate?: string;
  city?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

/** For anything that changes data: a pending, rejected or suspended NGO may look but not act. */
async function getApprovedNgoProfile(prisma: PrismaClient, userId: string) {
  return requireApprovedNgoProfile(prisma, userId);
}

async function getOwnNgoProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  return profile;
}

async function getOwnNurseryProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.nurseryProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Nursery profile not found');
  return profile;
}

// ---------- NGO side ----------

export async function createRequirement(prisma: PrismaClient, ngoUserId: string, input: CreateRequirementInput) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  const requirement = await prisma.bulkRequirement.create({
    data: {
      ngoId: ngo.id,
      driveId: input.driveId,
      speciesId: input.speciesId,
      speciesNote: input.speciesNote,
      nativePreferred: input.nativePreferred ?? false,
      quantityNeeded: input.quantityNeeded,
      neededByDate: input.neededByDate ? new Date(input.neededByDate) : undefined,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      notes: input.notes,
    },
    include: { species: { select: { commonName: true } } },
  });

  await fanOutToNearbyNurseries(prisma, requirement, ngo.orgName);
  return requirement;
}

async function fanOutToNearbyNurseries(
  prisma: PrismaClient,
  requirement: { id: string; city: string | null; lat: any; lng: any; quantityNeeded: number; species: { commonName: string } | null; speciesNote: string | null },
  ngoName: string,
) {
  try {
    const candidates = await prisma.nurseryProfile.findMany({
      where: { status: 'approved' },
      select: { id: true, userId: true, lat: true, lng: true, city: true },
    });

    const hasCoords = requirement.lat != null && requirement.lng != null;
    const relevant = candidates.filter((n) => {
      if (hasCoords && n.lat != null && n.lng != null) {
        return haversineDistanceKm({ lat: Number(requirement.lat), lng: Number(requirement.lng) }, { lat: Number(n.lat), lng: Number(n.lng) }) <= NEARBY_FANOUT_RADIUS_KM;
      }
      return requirement.city && n.city === requirement.city;
    });
    if (relevant.length === 0) return;

    const speciesLabel = requirement.species?.commonName ?? requirement.speciesNote ?? 'saplings';
    await prisma.notification.createMany({
      data: relevant.map((n) => ({
        userId: n.userId,
        type: 'bulk_requirement_nearby' as const,
        data: { requirementId: requirement.id, quantityNeeded: requirement.quantityNeeded, species: speciesLabel },
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('[bulkRequirement] nearby fan-out failed:', error);
  }
}

export type RequirementFilter = 'all' | 'attention' | 'open' | 'partially_fulfilled' | 'fulfilled' | 'expired' | 'cancelled';
export type RequirementSort = 'newest' | 'oldest' | 'deadline' | 'biggest';

export interface RequirementListQuery {
  cursor?: string;
  take?: string | number;
  /** Legacy single-status filter, kept for older clients. */
  status?: string;
  filter?: string;
  search?: string;
  sort?: string;
}

const FILTERS: RequirementFilter[] = ['all', 'attention', 'open', 'partially_fulfilled', 'fulfilled', 'expired', 'cancelled'];

/**
 * The NGO's requirements, searchable / filterable / sortable on the server so the list stays fast
 * with hundreds of them. "Needs attention" = something is waiting on the NGO: an offer to answer, a
 * handoff to confirm, or a deadline that passed unfulfilled.
 */
export async function listMyRequirements(prisma: PrismaClient, ngoUserId: string, status?: string, q: RequirementListQuery = {}) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const take = parseTake(q.take, 20, 50);
  const offset = Math.max(Number.parseInt(q.cursor ?? '0', 10) || 0, 0);

  const search = q.search?.trim();
  const searchWhere = search
    ? {
        OR: [
          { species: { commonName: { contains: search, mode: 'insensitive' as const } } },
          { speciesNote: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const scope = { ngoId: ngo.id, ...searchWhere };

  const attentionWhere = {
    OR: [
      { responses: { some: { status: { in: ['proposed' as const, 'handed_off' as const] } } } },
      { status: 'expired' as const },
    ],
    status: { notIn: ['cancelled' as const, 'fulfilled' as const] },
  };

  const filter = ((FILTERS as string[]).includes(q.filter ?? '') ? q.filter : status && (FILTERS as string[]).includes(status) ? status : 'all') as RequirementFilter;
  const where =
    filter === 'all'
      ? scope
      : filter === 'attention'
        ? { ...scope, ...attentionWhere }
        : { ...scope, status: filter };

  const orderBy =
    q.sort === 'oldest'
      ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
      : q.sort === 'deadline'
        ? [{ neededByDate: { sort: 'asc' as const, nulls: 'last' as const } }, { createdAt: 'desc' as const }, { id: 'desc' as const }]
        : q.sort === 'biggest'
          ? [{ quantityNeeded: 'desc' as const }, { id: 'desc' as const }]
          : [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  const [rows, total, byStatus, attention] = await Promise.all([
    prisma.bulkRequirement.findMany({
      where,
      orderBy,
      skip: offset,
      take,
      include: {
        species: { select: { commonName: true, emoji: true } },
        // Only what the card needs to summarise the offers; the full offers load in the detail sheet.
        responses: { select: { status: true, quantityOffered: true } },
      },
    }),
    prisma.bulkRequirement.count({ where }),
    prisma.bulkRequirement.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    prisma.bulkRequirement.count({ where: { ...scope, ...attentionWhere } }),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const counts = {
    all: byStatus.reduce((n, g) => n + g._count._all, 0),
    attention,
    open: statusCount.open ?? 0,
    partially_fulfilled: statusCount.partially_fulfilled ?? 0,
    fulfilled: statusCount.fulfilled ?? 0,
    expired: statusCount.expired ?? 0,
    cancelled: statusCount.cancelled ?? 0,
  };

  return {
    items: rows.map(({ responses, ...r }) => ({
      ...r,
      offerCount: responses.filter((x) => !['declined', 'withdrawn'].includes(x.status)).length,
      pendingOffers: responses.filter((x) => x.status === 'proposed').length,
      awaitingReceipt: responses.filter((x) => x.status === 'handed_off').length,
      acceptedQuantity: responses.filter((x) => ['accepted', 'handed_off', 'fulfilled'].includes(x.status)).reduce((n, x) => n + x.quantityOffered, 0),
    })),
    nextCursor: offset + take < total ? String(offset + take) : null,
    total,
    counts,
  };
}

export async function getMyRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({
    where: { id: requirementId, ngoId: ngo.id },
    include: {
      species: { select: { commonName: true, emoji: true } },
      drive: { select: { id: true, title: true, startsAt: true } },
      responses: {
        orderBy: { createdAt: 'desc' },
        include: { nursery: { select: { id: true, nurseryName: true, logoUrl: true, avgRating: true, city: true } } },
      },
    },
  });
  if (!requirement) throw new NotFoundError('Requirement not found');
  return requirement;
}

export interface UpdateRequirementInput {
  speciesId?: string | null;
  speciesNote?: string | null;
  nativePreferred?: boolean;
  quantityNeeded?: number;
  neededByDate?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
}

const LIVE_OFFER = ['proposed', 'accepted', 'handed_off', 'fulfilled'] as const;
const COMMITTED_OFFER = ['accepted', 'handed_off', 'fulfilled'] as const;

/**
 * Edits an open requirement. What may change depends on how far nurseries have got, so an edit can
 * never pull the rug from under an offer: the species is fixed once anyone has offered, the
 * quantity can't drop below what is already promised or received (or, with offers still pending,
 * below what they were priced against), and every nursery with a live offer is told what changed.
 */
export async function updateRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string, input: UpdateRequirementInput) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({
    where: { id: requirementId, ngoId: ngo.id },
    include: { responses: { select: { status: true, quantityOffered: true, nursery: { select: { userId: true } } } }, species: { select: { commonName: true } } },
  });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (!['open', 'partially_fulfilled'].includes(requirement.status)) {
    throw new BadRequestError(
      requirement.status === 'expired'
        ? 'This requirement has expired - reschedule it to reopen it'
        : 'Only an open requirement can be edited',
    );
  }

  const liveOffers = requirement.responses.filter((r) => (LIVE_OFFER as readonly string[]).includes(r.status));
  const pendingOffers = requirement.responses.filter((r) => r.status === 'proposed');
  const promised = requirement.responses
    .filter((r) => (COMMITTED_OFFER as readonly string[]).includes(r.status))
    .reduce((n, r) => n + r.quantityOffered, 0);

  if (liveOffers.length > 0) {
    const speciesChanged =
      (input.speciesId !== undefined && input.speciesId !== requirement.speciesId) ||
      (input.speciesNote !== undefined && (input.speciesNote ?? null) !== (requirement.speciesNote ?? null));
    if (speciesChanged) {
      throw new BadRequestError('The species can\'t change once nurseries have made offers - cancel this requirement and post a new one instead');
    }
  }

  if (input.quantityNeeded !== undefined && input.quantityNeeded !== requirement.quantityNeeded) {
    const floor = Math.max(requirement.quantityFulfilled, promised, pendingOffers.length > 0 ? requirement.quantityNeeded : 0);
    if (input.quantityNeeded < floor) {
      throw new BadRequestError(
        pendingOffers.length > 0 && floor === requirement.quantityNeeded
          ? `Nurseries have offered against ${requirement.quantityNeeded} saplings, so the quantity can only go up`
          : `The quantity can't go below ${floor} - that much is already received or promised`,
      );
    }
  }

  let newDate: Date | null | undefined;
  if (input.neededByDate !== undefined) {
    newDate = input.neededByDate ? new Date(input.neededByDate) : null;
    if (newDate && newDate <= new Date()) throw new BadRequestError('The new deadline must be in the future');
  }

  if (input.speciesId) {
    const species = await prisma.treeSpecies.findUnique({ where: { id: input.speciesId }, select: { id: true } });
    if (!species) throw new NotFoundError('Species not found');
  }

  const quantity = input.quantityNeeded ?? requirement.quantityNeeded;
  const updated = await prisma.bulkRequirement.update({
    where: { id: requirementId },
    data: {
      ...(input.speciesId !== undefined ? { speciesId: input.speciesId } : {}),
      ...(input.speciesNote !== undefined ? { speciesNote: input.speciesNote?.trim() || null } : {}),
      ...(input.nativePreferred !== undefined ? { nativePreferred: input.nativePreferred } : {}),
      quantityNeeded: quantity,
      ...(newDate !== undefined ? { neededByDate: newDate } : {}),
      ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
      ...(input.lat !== undefined ? { lat: input.lat } : {}),
      ...(input.lng !== undefined ? { lng: input.lng } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      // Lowering the target to what is already in hand completes it; otherwise keep the status honest.
      status: requirement.quantityFulfilled >= quantity ? 'fulfilled' : requirement.quantityFulfilled > 0 ? 'partially_fulfilled' : 'open',
    },
    include: { species: { select: { commonName: true, emoji: true } } },
  });

  // Tell every nursery that has a live offer exactly what moved.
  const changes: string[] = [];
  if (input.quantityNeeded !== undefined && input.quantityNeeded !== requirement.quantityNeeded) {
    changes.push(`quantity is now ${input.quantityNeeded.toLocaleString('en-IN')}`);
  }
  if (newDate !== undefined && (newDate?.getTime() ?? null) !== (requirement.neededByDate?.getTime() ?? null)) {
    changes.push(newDate ? `deadline is now ${newDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'the deadline was removed');
  }
  if ((input.city !== undefined && (input.city ?? null) !== (requirement.city ?? null)) || input.lat !== undefined || input.lng !== undefined) {
    changes.push('the delivery location changed');
  }
  if (input.notes !== undefined && (input.notes?.trim() || null) !== (requirement.notes ?? null)) changes.push('the NGO added or changed a note');

  if (changes.length > 0 && liveOffers.length > 0) {
    const speciesLabel = updated.species?.commonName ?? updated.speciesNote ?? 'saplings';
    const summary = `${changes.join(', ')}`;
    const userIds = [...new Set(liveOffers.map((r) => r.nursery.userId))];
    await Promise.all(
      userIds.map((userId) =>
        notify(prisma, {
          userId,
          type: 'bulk_requirement_updated',
          data: { requirementId, changes, message: `${ngo.orgName} updated the ${speciesLabel} requirement: ${summary}.` },
          push: { title: `${ngo.orgName} updated a requirement`, body: `${speciesLabel}: ${summary}` },
        }),
      ),
    );
  }

  return updated;
}

export async function cancelRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({ where: { id: requirementId, ngoId: ngo.id } });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (!['open', 'partially_fulfilled'].includes(requirement.status)) {
    throw new BadRequestError('This requirement can no longer be cancelled');
  }
  return prisma.bulkRequirement.update({ where: { id: requirementId }, data: { status: 'cancelled' } });
}

// A repair path, not a general "edit the date anytime" feature — only callable once
// bulkRequirementOverdue.job.ts has already flipped the requirement to 'expired'. Reopens to
// 'partially_fulfilled' rather than 'open' if some quantity was already fulfilled before the
// deadline passed, mirroring confirmResponseReceived's own status recompute in reverse.
export async function rescheduleRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string, neededByDate: string) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({ where: { id: requirementId, ngoId: ngo.id } });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (requirement.status !== 'expired') throw new BadRequestError('Only an expired requirement can be rescheduled');

  const newDate = new Date(neededByDate);
  if (newDate <= new Date()) throw new BadRequestError('New date must be in the future');

  return prisma.bulkRequirement.update({
    where: { id: requirementId },
    data: { neededByDate: newDate, status: requirement.quantityFulfilled > 0 ? 'partially_fulfilled' : 'open' },
  });
}

export async function acceptResponse(prisma: PrismaClient, ngoUserId: string, responseId: string) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({
    where: { id: responseId, requirement: { ngoId: ngo.id } },
    include: { requirement: true, nursery: { select: { userId: true, nurseryName: true } } },
  });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'proposed') throw new BadRequestError('This response has already been responded to');

  const updated = await prisma.bulkRequirementResponse.update({
    where: { id: responseId },
    data: { status: 'accepted', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: response.nursery.userId,
    type: 'bulk_requirement_response_accepted',
    data: { requirementId: response.requirementId, quantityOffered: response.quantityOffered },
    push: { title: 'Offer accepted!', body: `Your offer to supply ${response.quantityOffered} saplings was accepted.` },
  });

  return updated;
}

export async function declineResponse(prisma: PrismaClient, ngoUserId: string, responseId: string) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({ where: { id: responseId, requirement: { ngoId: ngo.id } } });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'proposed') throw new BadRequestError('This response has already been responded to');

  return prisma.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'declined', respondedAt: new Date() } });
}

// ---------- Nursery side ----------

/** Sums SaplingStock.quantity across every row the nursery holds for a species — there's no
 * unique constraint on (nurseryId, speciesId), so a nursery can have several rows for the same
 * species (different pot sizes/ages, or a legacy free-text row), and all of them count. */
async function getNurseryStockQuantity(prisma: PrismaClient, nurseryId: string, speciesId: string) {
  const result = await prisma.saplingStock.aggregate({
    where: { nurseryId, speciesId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export type NurseryRequirementTab = 'all' | 'open' | 'responded' | 'accepted' | 'completed';
export type NurseryRequirementSort = 'newest' | 'deadline' | 'nearest' | 'largest';

export interface NurseryRequirementQuery {
  cursor?: string;
  take?: string | number;
  /** Legacy single-status filter, kept for older clients. */
  status?: string;
  tab?: string;
  search?: string;
  sort?: string;
  speciesId?: string;
  native?: string;
  inStock?: string;
  radiusKm?: string | number;
  /** Which date the range applies to: when it is needed by, or when it was posted. */
  dateField?: string;
  from?: string;
  to?: string;
  minQty?: string | number;
}

const NURSERY_TABS: NurseryRequirementTab[] = ['all', 'open', 'responded', 'accepted', 'completed'];
const MAX_NURSERY_CANDIDATES = 3000;
const DEAD_RESPONSE = ['withdrawn', 'declined'];

type NurseryRow = Awaited<ReturnType<typeof hydrateForNursery>>[number];

/** The full card / detail payload for these requirement ids, in the order given. */
async function hydrateForNursery(
  prisma: PrismaClient,
  nursery: { id: string; lat: unknown; lng: unknown },
  ids: string[],
  stockMap?: Map<string, number>,
) {
  if (ids.length === 0) return [];
  const rows = await prisma.bulkRequirement.findMany({
    where: { id: { in: ids } },
    include: {
      species: { select: { commonName: true, emoji: true } },
      ngo: { select: { orgName: true, logoUrl: true, city: true } },
      responses: { where: { nurseryId: nursery.id } },
      // How many nurseries are competing - a signal for whether to bother, and how fast.
      _count: { select: { responses: { where: { status: { notIn: DEAD_RESPONSE as any } } } } },
    },
  });

  let stock = stockMap;
  if (!stock) {
    // One grouped query for every species in this set, instead of one per requirement.
    const speciesIds = [...new Set(rows.map((r) => r.speciesId).filter((x): x is string => x != null))];
    const grouped = speciesIds.length
      ? await prisma.saplingStock.groupBy({ by: ['speciesId'], where: { nurseryId: nursery.id, speciesId: { in: speciesIds } }, _sum: { quantity: true } })
      : [];
    stock = new Map(grouped.map((g) => [g.speciesId as string, g._sum.quantity ?? 0]));
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map(({ responses, _count, ...r }) => ({
      ...r,
      distanceKm:
        nursery.lat != null && nursery.lng != null && r.lat != null && r.lng != null
          ? haversineDistanceKm({ lat: Number(nursery.lat), lng: Number(nursery.lng) }, { lat: Number(r.lat), lng: Number(r.lng) })
          : null,
      myResponse: responses[0] ?? null,
      offerCount: _count.responses,
      // null means "not checkable" (requirement has no specific species) — distinct from 0 (checked, none in stock).
      myStockQuantity: r.speciesId ? stock!.get(r.speciesId) ?? 0 : null,
    }));
}

/**
 * Every requirement this nursery can act on or has acted on, searchable and filterable on the
 * server. Candidates are read as thin rows (so distance, stock and sorting can be done together),
 * filtered and sorted in memory, and only the requested page is loaded in full.
 */
export async function listRelevantForNursery(prisma: PrismaClient, nurseryUserId: string, q: NurseryRequirementQuery = {}) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const take = parseTake(q.take, 20, 50);
  const offset = Math.max(Number.parseInt(String(q.cursor ?? '0'), 10) || 0, 0);

  const search = q.search?.trim();
  const from = q.from ? new Date(q.from) : null;
  const to = q.to ? new Date(q.to) : null;
  if (to) to.setHours(23, 59, 59, 999);
  const dateKey = q.dateField === 'posted' ? 'createdAt' : 'neededByDate';
  const minQty = Number(q.minQty) > 0 ? Number(q.minQty) : null;

  const candidates = await prisma.bulkRequirement.findMany({
    where: {
      // Open ones anyone can offer on, finished ones for context, and anything this nursery already touched.
      OR: [{ status: { in: ['open', 'partially_fulfilled', 'fulfilled'] } }, { responses: { some: { nurseryId: nursery.id } } }],
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { species: { commonName: { contains: search, mode: 'insensitive' as const } } },
                  { speciesNote: { contains: search, mode: 'insensitive' as const } },
                  { notes: { contains: search, mode: 'insensitive' as const } },
                  { city: { contains: search, mode: 'insensitive' as const } },
                  { ngo: { orgName: { contains: search, mode: 'insensitive' as const } } },
                ],
              },
            ],
          }
        : {}),
      ...(q.speciesId ? { speciesId: q.speciesId } : {}),
      ...(q.native === 'true' ? { nativePreferred: true } : {}),
      ...(minQty ? { quantityNeeded: { gte: minQty } } : {}),
      ...(from || to ? { [dateKey]: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_NURSERY_CANDIDATES,
    select: {
      id: true,
      status: true,
      createdAt: true,
      neededByDate: true,
      quantityNeeded: true,
      speciesId: true,
      lat: true,
      lng: true,
      responses: { where: { nurseryId: nursery.id }, select: { status: true } },
    },
  });

  const stockRows = await prisma.saplingStock.groupBy({ by: ['speciesId'], where: { nurseryId: nursery.id }, _sum: { quantity: true } });
  const stockMap = new Map(stockRows.map((g) => [g.speciesId as string, g._sum.quantity ?? 0]));

  const radiusKm = Number(q.radiusKm) > 0 ? Number(q.radiusKm) : null;
  const rows = candidates
    .map((r) => ({
      ...r,
      myStatus: r.responses[0]?.status as string | undefined,
      distanceKm:
        nursery.lat != null && nursery.lng != null && r.lat != null && r.lng != null
          ? haversineDistanceKm({ lat: Number(nursery.lat), lng: Number(nursery.lng) }, { lat: Number(r.lat), lng: Number(r.lng) })
          : null,
    }))
    .filter((r) => (radiusKm ? r.distanceKm != null && r.distanceKm <= radiusKm : true))
    .filter((r) => (q.inStock === 'true' ? !!r.speciesId && (stockMap.get(r.speciesId) ?? 0) > 0 : true));

  // A withdrawn / declined offer is a dead end, not an active claim - if the requirement is still
  // open the nursery can offer again, so it belongs back in "Open".
  const hasNoActiveResponse = (r: (typeof rows)[number]) => !r.myStatus || DEAD_RESPONSE.includes(r.myStatus);
  const inTab = (r: (typeof rows)[number], tab: NurseryRequirementTab) => {
    switch (tab) {
      case 'open': return ['open', 'partially_fulfilled'].includes(r.status) && hasNoActiveResponse(r);
      case 'responded': return r.myStatus === 'proposed';
      case 'accepted': return r.myStatus === 'accepted' || r.myStatus === 'handed_off';
      case 'completed': return r.myStatus === 'fulfilled' || r.status === 'fulfilled';
      default: return true;
    }
  };

  const counts = Object.fromEntries(NURSERY_TABS.map((t) => [t, rows.filter((r) => inTab(r, t)).length])) as Record<NurseryRequirementTab, number>;

  const legacyTab = q.status === 'fulfilled' ? 'completed' : undefined;
  const tab = ((NURSERY_TABS as string[]).includes(q.tab ?? '') ? q.tab : legacyTab ?? 'open') as NurseryRequirementTab;
  const matched = rows.filter((r) => inTab(r, tab));

  const nullsLast = (a: number | null, b: number | null) => (a == null ? 1 : b == null ? -1 : a - b);
  if (q.sort === 'deadline') matched.sort((a, b) => nullsLast(a.neededByDate?.getTime() ?? null, b.neededByDate?.getTime() ?? null));
  else if (q.sort === 'nearest') matched.sort((a, b) => nullsLast(a.distanceKm, b.distanceKm));
  else if (q.sort === 'largest') matched.sort((a, b) => b.quantityNeeded - a.quantityNeeded);
  // 'newest' (default) is already the candidate order.

  const pageIds = matched.slice(offset, offset + take).map((r) => r.id);
  return {
    items: await hydrateForNursery(prisma, nursery, pageIds, stockMap),
    nextCursor: offset + take < matched.length ? String(offset + take) : null,
    total: matched.length,
    counts,
  };
}

/** One requirement in the same shape as a list row, for the detail screen and deep links. */
export async function getRequirementForNursery(prisma: PrismaClient, nurseryUserId: string, requirementId: string) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const [item] = await hydrateForNursery(prisma, nursery, [requirementId]);
  if (!item) throw new NotFoundError('Requirement not found');
  return item;
}

/** The nursery's full response history, every status — unlike listRelevantForNursery (which only
 * returns still-open/partially-fulfilled requirements with the nursery's response attached), this
 * is the activity-hub view: every offer this nursery has ever made, regardless of what happened
 * to the requirement since. */
export async function listMyResponses(prisma: PrismaClient, nurseryUserId: string, q: CursorQuery = {}) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const { take, args } = cursorArgs(q);

  const responses = await prisma.bulkRequirementResponse.findMany({
    where: { nurseryId: nursery.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...args,
    include: {
      requirement: { include: { species: { select: { commonName: true } }, ngo: { select: { orgName: true } } } },
    },
  });

  return toCursorPage(responses, take, (r) => ({
    id: r.id,
    status: r.status,
    quantityOffered: r.quantityOffered,
    priceCents: r.priceCents,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    requirementId: r.requirementId,
    ngoName: r.requirement.ngo.orgName,
    species: r.requirement.species?.commonName ?? r.requirement.speciesNote ?? 'Any species',
  }));
}

interface RespondInput {
  quantityOffered: number;
  priceCents?: number;
  canDeliver?: boolean;
  canPickup?: boolean;
  message?: string;
}

export async function respondToRequirement(prisma: PrismaClient, nurseryUserId: string, requirementId: string, input: RespondInput) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const requirement = await prisma.bulkRequirement.findUnique({
    where: { id: requirementId },
    include: { ngo: { select: { userId: true } }, species: { select: { commonName: true } } },
  });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (!['open', 'partially_fulfilled'].includes(requirement.status)) throw new BadRequestError('This requirement is no longer open');

  // Requirements with no specific species (free-text speciesNote, e.g. "any native species")
  // can't be checked against a stock line, so they skip this gate entirely.
  if (requirement.speciesId) {
    const available = await getNurseryStockQuantity(prisma, nursery.id, requirement.speciesId);
    if (input.quantityOffered > available) {
      throw new BadRequestError(
        `You only have ${available} ${requirement.species?.commonName ?? 'in stock'} available, but tried to offer ${input.quantityOffered}.`,
        'INSUFFICIENT_STOCK',
        { available, quantityOffered: input.quantityOffered, speciesId: requirement.speciesId, speciesName: requirement.species?.commonName ?? null },
      );
    }
  }

  const response = await prisma.bulkRequirementResponse.upsert({
    where: { requirementId_nurseryId: { requirementId, nurseryId: nursery.id } },
    // A nursery revises its offer by responding again — only while still just proposed.
    update: { quantityOffered: input.quantityOffered, priceCents: input.priceCents, canDeliver: input.canDeliver ?? false, canPickup: input.canPickup ?? true, message: input.message, status: 'proposed', respondedAt: null },
    create: {
      requirementId,
      nurseryId: nursery.id,
      quantityOffered: input.quantityOffered,
      priceCents: input.priceCents,
      canDeliver: input.canDeliver ?? false,
      canPickup: input.canPickup ?? true,
      message: input.message,
    },
  });

  await notify(prisma, {
    userId: requirement.ngo.userId,
    type: 'bulk_requirement_response_received',
    data: { requirementId, nurseryName: nursery.nurseryName, quantityOffered: input.quantityOffered },
    push: { title: nursery.nurseryName, body: `Offered ${input.quantityOffered} saplings for your requirement.` },
  });

  return response;
}

export async function withdrawResponse(prisma: PrismaClient, nurseryUserId: string, responseId: string) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({ where: { id: responseId, nurseryId: nursery.id } });
  if (!response) throw new NotFoundError('Response not found');
  if (!['proposed', 'accepted'].includes(response.status)) throw new BadRequestError('This offer can no longer be withdrawn');

  return prisma.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'withdrawn' } });
}

function generateHandoffCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Nursery declares the physical handoff has happened — but this alone must never be enough to
// count as fulfilled (a nursery self-attesting its own delivery with nothing to check it was the
// exact same gap this flow used to have). Mirrors Order's handoffCode: the code goes to the NGO
// out of band, and only confirmResponseReceived (below) — called by the NGO — actually mints
// units and updates reputation.
export async function markResponseHandedOff(prisma: PrismaClient, nurseryUserId: string, responseId: string) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({
    where: { id: responseId, nurseryId: nursery.id },
    include: { requirement: { include: { ngo: { select: { userId: true } } } } },
  });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'accepted') throw new BadRequestError('Only an accepted offer can be marked handed off');

  const handoffCode = generateHandoffCode();
  const updated = await prisma.bulkRequirementResponse.update({
    where: { id: responseId },
    data: { status: 'handed_off', handoffCode, respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: response.requirement.ngo.userId,
    type: 'bulk_requirement_response_received',
    // Same notification type as the first offer (no enum migration needed) - `stage` is what lets
    // the app tell "a nursery made an offer" apart from "a nursery handed the saplings over".
    data: { requirementId: response.requirementId, quantityOffered: response.quantityOffered, nurseryName: nursery.nurseryName, stage: 'handed_off' },
    push: { title: nursery.nurseryName, body: `Handed off ${response.quantityOffered} saplings — confirm receipt with the handoff code to complete it.` },
  });

  return updated;
}

// NGO confirms it actually received the saplings — the point at which a bulk-requirement supply
// becomes real: quantityFulfilled rolls up, the requirement's status recomputes, the nursery's
// achievements are re-evaluated, and (decision 8) real ArthSaplingUnit rows are issued so each
// sapling gets the same QR/Tree-passport treatment as a marketplace purchase. Whichever logged-in
// volunteer later scans+plants one becomes that Tree's owner — no new ownership concept needed,
// since Tree ownership is already always "whoever verified the plant."
export async function confirmResponseReceived(prisma: PrismaClient, ngoUserId: string, responseId: string, code: string) {
  const ngo = await getApprovedNgoProfile(prisma, ngoUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({
    where: { id: responseId, requirement: { ngoId: ngo.id } },
    include: { requirement: { include: { species: true } }, nursery: { select: { id: true, userId: true, nurseryName: true } } },
  });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'handed_off') throw new BadRequestError('This offer has not been handed off yet');
  if (response.handoffCode !== code) throw new BadRequestError('Incorrect handoff code');

  const nursery = response.nursery;

  let stockBefore: { stockId: string; quantity: number } | null = null;
  await prisma.$transaction(async (tx) => {
    await tx.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'fulfilled', respondedAt: new Date() } });

    const newFulfilled = response.requirement.quantityFulfilled + response.quantityOffered;
    await tx.bulkRequirement.update({
      where: { id: response.requirementId },
      data: {
        quantityFulfilled: newFulfilled,
        status: newFulfilled >= response.requirement.quantityNeeded ? 'fulfilled' : 'partially_fulfilled',
      },
    });

    // The supplied saplings physically leave the nursery's own shelf too — deduct them from a
    // matching listed stock item (same species) if one exists, same as a marketplace order or a
    // reservation does. BulkRequirementResponse has no stockId of its own (a nursery can fulfil a
    // requirement out of growing capacity it hasn't listed publicly at all), so this is a
    // best-effort match by species, not a hard link; nothing to deduct just means the supply came
    // from stock never listed in the inventory screen.
    if (response.requirement.speciesId) {
      const matchingStock = await tx.saplingStock.findFirst({
        where: { nurseryId: nursery.id, speciesId: response.requirement.speciesId },
        orderBy: { quantity: 'desc' },
      });
      if (matchingStock && matchingStock.quantity > 0) {
        const deducted = Math.min(matchingStock.quantity, response.quantityOffered);
        stockBefore = { stockId: matchingStock.id, quantity: matchingStock.quantity };
        await tx.saplingStock.update({ where: { id: matchingStock.id }, data: { quantity: { decrement: deducted } } });
        await tx.saplingStockLedger.create({
          data: {
            nurseryId: nursery.id,
            stockId: matchingStock.id,
            species: matchingStock.species,
            delta: -deducted,
            reason: 'bulk_requirement_fulfilled',
          },
        });
      }
    }

    const speciesNameSnapshot = response.requirement.species?.commonName ?? response.requirement.speciesNote ?? 'Sapling';
    const units = Array.from({ length: response.quantityOffered }, () => ({
      bulkRequirementResponseId: response.id,
      nurseryId: nursery.id,
      speciesId: response.requirement.speciesId,
      speciesNameSnapshot,
    }));
    if (units.length > 0) await tx.arthSaplingUnit.createMany({ data: units });

    await recordNurseryContribution(tx, nursery.id, ['arth_contribution']);
    await evaluateNurseryAchievements(tx, nursery.id);
    await recomputeReputation(tx, nursery.id);
  });

  if (stockBefore) await alertOnStockBandChange(prisma, (stockBefore as { stockId: string }).stockId, (stockBefore as { quantity: number }).quantity);

  await notify(prisma, {
    userId: nursery.userId,
    type: 'bulk_requirement_response_fulfilled',
    data: { requirementId: response.requirementId, quantityOffered: response.quantityOffered },
    push: { title: 'Receipt confirmed', body: `The NGO confirmed receipt of ${response.quantityOffered} saplings.` },
  });

  return prisma.bulkRequirementResponse.findUniqueOrThrow({ where: { id: responseId } });
}
