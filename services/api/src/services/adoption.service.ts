import { PrismaClient } from '@arth/db';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { geocodeAddress } from '../utils/geocode';
import { haversineDistanceKm } from '../utils/geo';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { notify } from './notification.service';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';

interface CreateAdoptableTreeInput {
  nickname: string;
  speciesName: string;
  description: string;
  instructions?: string;
  city: string;
  locationLabel?: string;
  photoUrl?: string;
  // Present only when this listing is created FROM a real PlantedTree row — lets the listing
  // resolve to an actual tree identity (so its Passport's "People" section can show the
  // adopter), per "connect, don't force" — existing standalone listings (this field omitted)
  // keep their own fields as the only source of truth, exactly as before.
  plantedTreeId?: string;
}

interface UpdateAdoptableTreeInput {
  nickname?: string;
  speciesName?: string;
  description?: string;
  instructions?: string;
  city?: string;
  locationLabel?: string;
  photoUrl?: string;
}

interface NearbyFilter {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  ngoId?: string;
}

interface OwnedListFilter {
  q?: string;
  page?: number;
  take?: number;
}

const adoptableTreeInclude = { ngo: true, adoption: { include: { user: { select: { name: true, handle: true } } } } };

async function findOwnedTreeOrThrow(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const tree = await prisma.adoptableTree.findFirst({ where: { id: treeId, ngoId: ngo.id } });
  if (!tree) throw new NotFoundError('Adoptable tree not found');
  return { ngo, tree };
}


export async function createAdoptableTree(prisma: PrismaClient, ngoUserId: string, input: CreateAdoptableTreeInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  let plantedTreeFields: { speciesName?: string; photoUrl?: string | null; locationLabel?: string | null; lat?: number; lng?: number } = {};
  if (input.plantedTreeId) {
    const plantedTree = await prisma.plantedTree.findFirst({ where: { id: input.plantedTreeId, ngoId: ngo.id } });
    if (!plantedTree) throw new NotFoundError('Planted tree not found');
    plantedTreeFields = {
      speciesName: plantedTree.speciesName,
      photoUrl: plantedTree.photoUrl,
      locationLabel: plantedTree.locationLabel,
      lat: plantedTree.lat !== null ? Number(plantedTree.lat) : undefined,
      lng: plantedTree.lng !== null ? Number(plantedTree.lng) : undefined,
    };
  }

  // Only geocode from the city/address when there's no real PlantedTree coordinate to use
  // instead — unchanged behavior for every standalone listing.
  const geo = plantedTreeFields.lat === undefined ? await geocodeAddress(`${input.locationLabel ?? ''}, ${input.city}`) : null;

  return prisma.adoptableTree.create({
    data: {
      ngoId: ngo.id,
      nickname: input.nickname,
      speciesName: plantedTreeFields.speciesName ?? input.speciesName,
      description: input.description,
      instructions: input.instructions,
      city: input.city,
      locationLabel: plantedTreeFields.locationLabel ?? input.locationLabel,
      photoUrl: plantedTreeFields.photoUrl ?? input.photoUrl,
      lat: plantedTreeFields.lat ?? geo?.lat,
      lng: plantedTreeFields.lng ?? geo?.lng,
      plantedTreeId: input.plantedTreeId,
    },
    include: adoptableTreeInclude,
  });
}

export async function updateAdoptableTree(
  prisma: PrismaClient,
  ngoUserId: string,
  treeId: string,
  input: UpdateAdoptableTreeInput,
) {
  const { tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);

  let geo: { lat: number; lng: number } | null | undefined;
  if (input.city !== undefined || input.locationLabel !== undefined) {
    const locationLabel = input.locationLabel ?? tree.locationLabel ?? '';
    const city = input.city ?? tree.city ?? '';
    geo = await geocodeAddress(`${locationLabel}, ${city}`);
  }

  return prisma.adoptableTree.update({
    where: { id: tree.id },
    data: { ...input, ...(geo !== undefined ? { lat: geo?.lat ?? null, lng: geo?.lng ?? null } : {}) },
    include: adoptableTreeInclude,
  });
}

/**
 * Runs inside the transaction that ends an adoption (adopter release, NGO release, or delisting).
 * Archives the departing adopter's accepted check-ins and approved community updates so the next
 * adopter starts with a clean timeline (the NGO still sees them), and auto-declines community
 * updates that were still waiting on the departing adopter. Returns the declined updates so their
 * senders can be told once the transaction commits.
 */
async function endAdoptionCleanup(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  listing: { id: string; plantedTreeId: string | null },
) {
  const scope = {
    OR: [{ adoptableTreeId: listing.id }, ...(listing.plantedTreeId ? [{ plantedTreeId: listing.plantedTreeId }] : [])],
  };
  const pending = await tx.treeObservation.findMany({
    where: { ...scope, observerRole: 'community', reviewStatus: 'pending' },
    select: { id: true, observerUserId: true },
  });
  const now = new Date();
  if (pending.length > 0) {
    await tx.treeObservation.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { reviewStatus: 'rejected', reviewedAt: now },
    });
  }
  await tx.treeObservation.updateMany({
    where: { ...scope, archivedAt: null, reviewStatus: 'accepted', observerRole: { in: ['owner', 'community'] } },
    data: { archivedAt: now },
  });
  return pending;
}

async function notifyDeclinedSenders(
  prisma: PrismaClient,
  pending: { id: string; observerUserId: string }[],
  listing: { id: string; plantedTreeId: string | null },
) {
  for (const p of pending) {
    await notify(prisma, {
      userId: p.observerUserId,
      type: 'tree_update_decided',
      data: { observationId: p.id, adoptableTreeId: listing.id, plantedTreeId: listing.plantedTreeId, decision: 'rejected' },
      push: { title: 'Your tree update was reviewed', body: 'The tree changed hands before your update could be reviewed, so it was not added.' },
    });
  }
}

/**
 * Delisting a tree that's currently adopted must not leave an orphaned Adoption row pointing at
 * a tree the adopter can no longer see anywhere else (it would still show in "My Adopted Trees"
 * with a working Release button that — since there'd be no removed-status check — would put the
 * tree straight back in the public pool, undoing the NGO's removal without them ever knowing).
 * So an active adoption is released as part of removal, and the adopter is told why.
 */
export async function removeAdoptableTree(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const { ngo, tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);

  const { updated, releasedAdopterId, declined } = await prisma.$transaction(async (tx) => {
    let releasedAdopterId: string | null = null;
    let declined: { id: string; observerUserId: string }[] = [];
    if (tree.status === 'adopted') {
      const adoption = await tx.adoption.findUnique({ where: { adoptableTreeId: tree.id } });
      if (adoption) {
        releasedAdopterId = adoption.userId;
        await tx.adoption.delete({ where: { adoptableTreeId: tree.id } });
        declined = await endAdoptionCleanup(tx, tree);
      }
    }
    const updated = await tx.adoptableTree.update({
      where: { id: tree.id },
      data: { status: 'removed' },
      include: adoptableTreeInclude,
    });
    return { updated, releasedAdopterId, declined };
  });
  await notifyDeclinedSenders(prisma, declined, tree);

  if (releasedAdopterId) {
    await notify(prisma, {
      userId: releasedAdopterId,
      type: 'adoptable_tree_removed',
      actorNgoId: ngo.id,
      data: { treeId: tree.id, treeNickname: tree.nickname },
      push: { title: ngo.orgName, body: `Removed the listing for "${tree.nickname}" — your adoption of it has ended.` },
    });
  }

  return updated;
}

export async function listAdoptableTrees(prisma: PrismaClient, filter: NearbyFilter) {
  const trees = await prisma.adoptableTree.findMany({
    // Adopted trees stay listed (status: 'available' | 'adopted') so people can still see what's
    // already been claimed — only a genuinely retracted ('removed') tree is hidden.
    where: { status: { not: 'removed' }, ngo: { status: 'approved' }, ...(filter.ngoId ? { ngoId: filter.ngoId } : {}) },
    include: adoptableTreeInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 500,
  });

  let results = trees.map((tree) => ({
    tree,
    distanceKm:
      filter.lat !== undefined && filter.lng !== undefined && tree.lat !== null && tree.lng !== null
        ? haversineDistanceKm({ lat: filter.lat, lng: filter.lng }, { lat: Number(tree.lat), lng: Number(tree.lng) })
        : undefined,
  }));

  if (filter.radiusKm !== undefined && filter.lat !== undefined) {
    results = results.filter((r) => (r.distanceKm ?? Infinity) <= filter.radiusKm!);
  }

  if (filter.lat !== undefined && filter.lng !== undefined) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return results.slice(0, filter.limit ?? 100);
}

export async function getAdoptableTree(prisma: PrismaClient, treeId: string) {
  const tree = await prisma.adoptableTree.findUnique({ where: { id: treeId }, include: adoptableTreeInclude });
  if (!tree) throw new NotFoundError('Adoptable tree not found');
  return tree;
}

export async function listOwnedAdoptableTrees(prisma: PrismaClient, ngoUserId: string, filter: OwnedListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.adoptableTree.findMany({
    where: {
      ngoId: ngo.id,
      ...(filter.q ? { nickname: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    },
    include: adoptableTreeInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    skip: (page - 1) * take,
  });
}

export async function releaseAdoption(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const { tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);
  if (tree.status !== 'adopted') throw new ConflictError('This tree is not currently adopted');

  const { updated, declined } = await prisma.$transaction(async (tx) => {
    await tx.adoption.delete({ where: { adoptableTreeId: tree.id } });
    const declined = await endAdoptionCleanup(tx, tree);
    const updated = await tx.adoptableTree.update({
      where: { id: tree.id },
      data: { status: 'available' },
      include: adoptableTreeInclude,
    });
    return { updated, declined };
  });
  await notifyDeclinedSenders(prisma, declined, tree);
  return updated;
}

export async function listMyAdoptedTrees(prisma: PrismaClient, userId: string, q: CursorQuery = {}) {
  const { take, args } = cursorArgs(q);
  const adoptions = await prisma.adoption.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { adoptableTree: { include: adoptableTreeInclude } },
    ...args,
  });
  return toCursorPage(adoptions, take, (a) => a.adoptableTree);
}

/**
 * Self-service sibling of releaseAdoption (NGO-initiated): the adopter gives up their own tree.
 * Their history is archived for the next adopter, updates still waiting on them are declined, and
 * the NGO is told (with the adopter's reason, if they gave one).
 */
export async function releaseAdoptionByUser(prisma: PrismaClient, userId: string, treeId: string, reason?: string) {
  const adoption = await prisma.adoption.findFirst({
    where: { adoptableTreeId: treeId, userId },
    include: {
      user: { select: { name: true } },
      adoptableTree: { select: { id: true, nickname: true, plantedTreeId: true, ngo: { select: { id: true, userId: true, orgName: true } } } },
    },
  });
  if (!adoption) throw new NotFoundError('You have not adopted this tree');
  const listing = adoption.adoptableTree;

  const { updated, declined } = await prisma.$transaction(async (tx) => {
    await tx.adoption.delete({ where: { adoptableTreeId: treeId } });
    const declined = await endAdoptionCleanup(tx, listing);
    const updated = await tx.adoptableTree.update({
      where: { id: treeId },
      data: { status: 'available' },
      include: adoptableTreeInclude,
    });
    return { updated, declined };
  });

  await notifyDeclinedSenders(prisma, declined, listing);
  const trimmedReason = reason?.trim();
  await notify(prisma, {
    userId: listing.ngo.userId,
    type: 'ngo_tree_released',
    actorUserId: userId,
    data: { treeId, treeNickname: listing.nickname, reason: trimmedReason || null },
    push: {
      title: listing.ngo.orgName,
      body: `${adoption.user.name} released ${listing.nickname}${trimmedReason ? `: ${trimmedReason}` : ''}. It is available for adoption again.`,
    },
  });

  return updated;
}

export async function adoptTree(prisma: PrismaClient, userId: string, treeId: string, message?: string) {
  const adoption = await prisma.$transaction(async (tx) => {
    const tree = await tx.adoptableTree.findUnique({ where: { id: treeId }, include: { ngo: { select: { userId: true, orgName: true } } } });
    if (!tree || tree.status !== 'available') throw new ConflictError('This tree is no longer available for adoption');
    if (tree.ngo.userId === userId) throw new ForbiddenError('You cannot adopt your own listed tree');

    await tx.adoptableTree.update({ where: { id: treeId }, data: { status: 'adopted' } });

    const created = await tx.adoption.create({
      data: { adoptableTreeId: treeId, userId, message },
      include: { adoptableTree: { include: adoptableTreeInclude } },
    });

    return { created, tree };
  });

  const adopter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(prisma, {
    userId: adoption.tree.ngo.userId,
    type: 'ngo_tree_adopted',
    actorUserId: userId,
    data: { treeId, treeNickname: adoption.tree.nickname },
    push: { title: adoption.tree.ngo.orgName, body: `${adopter?.name ?? 'Someone'} adopted ${adoption.tree.nickname}` },
  });

  return adoption.created;
}

export interface TreeHealthSummary {
  healthStatus: string;
  lastCheckedAt: Date | null;
  pendingUpdatesCount: number;
}

interface ListingRef {
  id: string;
  plantedTreeId: string | null;
}

/**
 * Latest health snapshot per listing, keyed by the listing id, for the adoption lists. Every
 * listing gets one: a linked listing also folds in its PlantedTree's NGO health checks and
 * observations, a standalone one only has what was posted on the listing itself. Matches the
 * Passport's rule: the canonical status comes from NGO health checks and owner/NGO observations
 * only (community updates never move it), while "last checked" counts any accepted entry.
 * `countPendingForUserId` adds how many community updates still await that adopter's decision.
 */
export async function getHealthSummaries(
  prisma: PrismaClient,
  listings: ListingRef[],
  opts: { countPendingForUserId?: string } = {},
) {
  const summaries = new Map<string, TreeHealthSummary>();
  for (const l of listings) summaries.set(l.id, { healthStatus: 'not_checked', lastCheckedAt: null, pendingUpdatesCount: 0 });
  if (listings.length === 0) return summaries;

  const listingIds = listings.map((l) => l.id);
  const plantedIds = Array.from(new Set(listings.map((l) => l.plantedTreeId).filter((id): id is string => !!id)));
  const listingsByPlanted = new Map<string, string[]>();
  for (const l of listings) {
    if (!l.plantedTreeId) continue;
    listingsByPlanted.set(l.plantedTreeId, [...(listingsByPlanted.get(l.plantedTreeId) ?? []), l.id]);
  }

  const [checks, observations] = await Promise.all([
    plantedIds.length
      ? prisma.treeHealthCheck.findMany({
          where: { plantedTreeId: { in: plantedIds } },
          select: { plantedTreeId: true, status: true, checkedAt: true },
        })
      : Promise.resolve([]),
    prisma.treeObservation.findMany({
      where: {
        reviewStatus: { in: ['accepted', 'pending'] },
        OR: [{ adoptableTreeId: { in: listingIds } }, ...(plantedIds.length ? [{ plantedTreeId: { in: plantedIds } }] : [])],
      },
      select: { adoptableTreeId: true, plantedTreeId: true, status: true, observerRole: true, reviewStatus: true, createdAt: true },
    }),
  ]);

  const statusAt = new Map<string, Date>();
  const bump = (id: string, at: Date, status: string | null) => {
    const entry = summaries.get(id)!;
    if (!entry.lastCheckedAt || at > entry.lastCheckedAt) entry.lastCheckedAt = at;
    if (status && (!statusAt.has(id) || at > statusAt.get(id)!)) {
      statusAt.set(id, at);
      entry.healthStatus = status;
    }
  };

  for (const c of checks) {
    for (const id of listingsByPlanted.get(c.plantedTreeId ?? '') ?? []) bump(id, c.checkedAt, c.status);
  }
  for (const o of observations) {
    // An observation can carry both ids (listing linked to a PlantedTree); count it once per listing.
    const targets = new Set<string>();
    if (o.adoptableTreeId && summaries.has(o.adoptableTreeId)) targets.add(o.adoptableTreeId);
    for (const id of listingsByPlanted.get(o.plantedTreeId ?? '') ?? []) targets.add(id);
    for (const id of targets) {
      if (o.reviewStatus === 'pending') {
        if (opts.countPendingForUserId) summaries.get(id)!.pendingUpdatesCount += 1;
        continue;
      }
      bump(id, o.createdAt, o.observerRole === 'community' ? null : o.status);
    }
  }
  return summaries;
}

/**
 * Timeline + (adopter-only) pending community updates for one listing, in the same entry shape
 * as the Passport timeline so the app can render it the same way.
 */
export async function getAdoptionStatus(prisma: PrismaClient, adoptableTreeId: string, requesterId?: string) {
  const listing = await prisma.adoptableTree.findUnique({
    where: { id: adoptableTreeId },
    select: {
      id: true,
      plantedTreeId: true,
      status: true,
      adoption: { select: { userId: true } },
      plantedTree: { select: { publicId: true } },
      ngo: { select: { userId: true } },
    },
  });
  if (!listing) throw new NotFoundError('Adoptable tree not found');

  // The NGO sees archived history from earlier adopters too; everyone else starts clean.
  const isNgoViewer = !!requesterId && listing.ngo.userId === requesterId;
  const observations = await prisma.treeObservation.findMany({
    where: {
      reviewStatus: { not: 'rejected' },
      ...(isNgoViewer ? {} : { archivedAt: null }),
      OR: [{ adoptableTreeId: listing.id }, ...(listing.plantedTreeId ? [{ plantedTreeId: listing.plantedTreeId }] : [])],
    },
    orderBy: { createdAt: 'desc' },
    include: { observerUser: { select: { id: true, name: true, handle: true } } },
  });
  const checks = listing.plantedTreeId
    ? await prisma.treeHealthCheck.findMany({ where: { plantedTreeId: listing.plantedTreeId }, orderBy: { checkedAt: 'desc' } })
    : [];

  const isAdopter = !!requesterId && listing.adoption?.userId === requesterId;
  const timeline = [
    ...checks.map((c) => ({
      id: c.id,
      source: 'health_check' as const,
      status: c.status as string | null,
      note: c.notes,
      photoUrl: c.photoUrl,
      at: c.checkedAt,
      observerRole: undefined as 'owner' | 'ngo' | 'community' | undefined,
      observer: null as { id: string; name: string; handle: string } | null,
      archived: false,
    })),
    ...observations
      .filter((o) => o.reviewStatus === 'accepted')
      .map((o) => ({
        id: o.id,
        source: 'observation' as const,
        status: o.status as string | null,
        note: o.note,
        photoUrl: o.photoUrl,
        at: o.createdAt,
        observerRole: o.observerRole as 'owner' | 'ngo' | 'community' | undefined,
        observer: o.observerUser,
        archived: o.archivedAt != null,
      })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const pendingUpdates = isAdopter
    ? observations
        .filter((o) => o.reviewStatus === 'pending')
        .map((o) => ({ id: o.id, photoUrl: o.photoUrl, note: o.note, at: o.createdAt, observer: o.observerUser }))
    : [];

  return {
    adoptableTreeId: listing.id,
    plantedTreeId: listing.plantedTreeId,
    publicId: listing.plantedTree?.publicId ?? null,
    isAdopter,
    timeline,
    pendingUpdates,
  };
}
