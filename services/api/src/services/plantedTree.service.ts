import { PrismaClient, TreeHealthStatus, generatePublicId } from '@arth/db';

// 'not_checked' is a derived absence-of-check state, never something you can actually log a
// health check as — the routes' zod schemas already restrict incoming status to these four.
export type ActionableHealthStatus = Exclude<TreeHealthStatus, 'not_checked'>;
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { recordNgoContribution, recomputeReputation } from './ngoReputation.service';

interface BulkCreateInput {
  driveId?: string;
  zoneId?: string;
  speciesName: string;
  count: number;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  // Present only when the NGO is scanning individually-tracked saplings that arrived via a
  // nursery bulk-requirement fulfilment (see bulkRequirement.service.ts) — completes the
  // nursery->NGO batch provenance chain. Must have exactly `count` entries when provided; the
  // existing no-units path (a bare count + one representative photo) is unaffected.
  saplingUnitIds?: string[];
}

interface ListFilter {
  /** undefined = no drive filter, null = only driveless trees, string = a specific drive. */
  driveId?: string | null;
  /** undefined = no zone filter, null = only unzoned trees, string = a specific zone. */
  zoneId?: string | null;
  speciesName?: string;
  page?: number;
  take?: number;
}

// Latest status per tree, in one query — orders all matching health checks by
// recency and keeps only the first (most recent) row seen per plantedTreeId.
export async function getLatestStatusByTree(prisma: PrismaClient, plantedTreeIds: string[]) {
  const map = new Map<string, TreeHealthStatus>();
  if (plantedTreeIds.length === 0) return map;

  const checks = await prisma.treeHealthCheck.findMany({
    where: { plantedTreeId: { in: plantedTreeIds } },
    orderBy: { checkedAt: 'desc' },
    select: { plantedTreeId: true, status: true },
  });
  for (const c of checks) {
    if (!map.has(c.plantedTreeId)) map.set(c.plantedTreeId, c.status);
  }
  return map;
}

const UNIQUE_ID_GENERATION_PASSES = 5;

// createManyAndReturn can't retry per-row the way a single create() can, so generate `count`
// candidate publicIds up front, check them against the DB in one findMany, and regenerate only
// the colliding ones — convergence in 1-2 passes is expected at this ID-space size.
async function generateUniquePublicIds(prisma: PrismaClient, count: number): Promise<string[]> {
  const ids = new Set<string>();
  while (ids.size < count) ids.add(generatePublicId());
  let candidates = Array.from(ids);

  for (let pass = 0; pass < UNIQUE_ID_GENERATION_PASSES; pass++) {
    const existing = await prisma.plantedTree.findMany({
      where: { publicId: { in: candidates } },
      select: { publicId: true },
    });
    if (existing.length === 0) return candidates;

    const taken = new Set(existing.map((e) => e.publicId));
    const regenerated = new Set(candidates.filter((id) => !taken.has(id)));
    while (regenerated.size < count) regenerated.add(generatePublicId());
    candidates = Array.from(regenerated);
  }
  throw new Error('Could not generate enough unique publicIds');
}

// Creates `count` individual PlantedTree rows in one call (NGOs realistically plant in the
// hundreds). Trees start with no health-check record at all — they read as 'not_checked' until
// someone actually inspects them, rather than a fake auto-'healthy' check that used to make an
// uninspected batch report 100% survival.
export async function bulkCreatePlantedTrees(prisma: PrismaClient, ngoUserId: string, input: BulkCreateInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  // A bare self-reported count with no evidence at all fed straight into the NGO's own Growth
  // Level tier (see ngoReputation.service.ts's lifetimeTreesPlanted) — require at least a
  // representative photo of the batch, same evidence bar as an individual tree planting.
  if (!input.photoUrl) throw new BadRequestError('A photo of the planting is required to log trees.');

  if (input.saplingUnitIds && input.saplingUnitIds.length !== input.count) {
    throw new BadRequestError('saplingUnitIds must have exactly `count` entries.');
  }

  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  if (input.zoneId) {
    const zone = await prisma.plantationZone.findFirst({ where: { id: input.zoneId, ngoId: ngo.id, driveId: input.driveId } });
    if (!zone) throw new NotFoundError('Zone not found');
  }

  const publicIds = await generateUniquePublicIds(prisma, input.count);

  return prisma.$transaction(async (tx) => {
    if (input.saplingUnitIds) {
      // Must be collected, must belong to a bulk-requirement fulfilment this NGO itself raised
      // — never a marketplace/reservation-sourced unit, which is tree.service.ts's plantTree's
      // path instead, never this one.
      const matched = await tx.arthSaplingUnit.findMany({
        where: {
          id: { in: input.saplingUnitIds },
          status: 'collected',
          bulkRequirementResponse: { requirement: { ngoId: ngo.id } },
        },
        select: { id: true },
      });
      if (matched.length !== input.saplingUnitIds.length) {
        throw new BadRequestError('One or more sapling units could not be matched to a collected bulk-requirement fulfilment for this NGO.');
      }
    }

    const created = await tx.plantedTree.createManyAndReturn({
      data: publicIds.map((publicId) => ({
        ngoId: ngo.id,
        driveId: input.driveId,
        zoneId: input.zoneId,
        speciesName: input.speciesName,
        locationLabel: input.locationLabel,
        lat: input.lat,
        lng: input.lng,
        photoUrl: input.photoUrl,
        publicId,
      })),
    });

    if (input.saplingUnitIds) {
      await Promise.all(
        input.saplingUnitIds.map((unitId, i) =>
          tx.arthSaplingUnit.update({ where: { id: unitId }, data: { status: 'planted', plantedTreeId: created[i].id } }),
        ),
      );
    }

    await recordNgoContribution(tx, ngo.id, ['impact_verification']);
    await recomputeReputation(tx, ngo.id);

    return { createdCount: created.length, plantedTreeIds: created.map((t) => t.id) };
  });
}

export async function listOwnPlantedTrees(prisma: PrismaClient, ngoUserId: string, filter: ListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 200);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    ngoId: ngo.id,
    ...(filter.driveId !== undefined ? { driveId: filter.driveId } : {}),
    ...(filter.zoneId !== undefined ? { zoneId: filter.zoneId } : {}),
    ...(filter.speciesName ? { speciesName: { contains: filter.speciesName, mode: 'insensitive' as const } } : {}),
  };

  const [trees, total] = await Promise.all([
    prisma.plantedTree.findMany({
      where,
      orderBy: { plantedAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: { drive: { select: { id: true, title: true } }, zone: { select: { id: true, name: true } } },
    }),
    prisma.plantedTree.count({ where }),
  ]);

  const statusByTree = await getLatestStatusByTree(prisma, trees.map((t) => t.id));

  return {
    total,
    trees: trees.map((t) => ({ ...t, latestStatus: statusByTree.get(t.id) ?? 'not_checked' })),
  };
}

async function findOwnedPlantedTreeOrThrow(prisma: PrismaClient, ngoUserId: string, plantedTreeId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const tree = await prisma.plantedTree.findFirst({ where: { id: plantedTreeId, ngoId: ngo.id } });
  if (!tree) throw new NotFoundError('Planted tree not found');
  return tree;
}

// Read-only counterpart of findOwnedPlantedTreeOrThrow — detail/history views shouldn't be
// gated behind NGO approval status the way logging a new check is.
async function findOwnedPlantedTreeForRead(prisma: PrismaClient, ngoUserId: string, plantedTreeId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const tree = await prisma.plantedTree.findFirst({
    where: { id: plantedTreeId, ngoId: ngo.id },
    include: { drive: { select: { id: true, title: true } }, zone: { select: { id: true, name: true } } },
  });
  if (!tree) throw new NotFoundError('Planted tree not found');
  return tree;
}

export async function getPlantedTreeDetail(prisma: PrismaClient, ngoUserId: string, plantedTreeId: string) {
  const tree = await findOwnedPlantedTreeForRead(prisma, ngoUserId, plantedTreeId);
  const statusByTree = await getLatestStatusByTree(prisma, [tree.id]);
  return { ...tree, latestStatus: statusByTree.get(tree.id) ?? 'not_checked' };
}

export async function listHealthChecksForTree(prisma: PrismaClient, ngoUserId: string, plantedTreeId: string) {
  const tree = await findOwnedPlantedTreeForRead(prisma, ngoUserId, plantedTreeId);
  return prisma.treeHealthCheck.findMany({
    where: { plantedTreeId: tree.id },
    orderBy: { checkedAt: 'desc' },
  });
}

// No per-user timezone stored anywhere in this schema (see streaks.job.ts) — "today" is
// approximated as the server's own local day, same as the other day-boundary checks in
// ngo.service.ts.
function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

async function findTodaysHealthCheck(prisma: PrismaClient, plantedTreeId: string) {
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.treeHealthCheck.findFirst({
    where: { plantedTreeId, checkedAt: { gte: start, lt: end } },
    orderBy: { checkedAt: 'desc' },
  });
}

export async function logHealthCheck(
  prisma: PrismaClient,
  ngoUserId: string,
  plantedTreeId: string,
  input: { status: ActionableHealthStatus; notes?: string; photoUrl?: string; updateExisting?: boolean },
) {
  const tree = await findOwnedPlantedTreeOrThrow(prisma, ngoUserId, plantedTreeId);
  const existingToday = await findTodaysHealthCheck(prisma, tree.id);

  if (existingToday && !input.updateExisting) {
    throw new ConflictError('A health check was already logged for this tree today.', { existingCheck: existingToday });
  }

  if (existingToday) {
    const check = await prisma.treeHealthCheck.update({
      where: { id: existingToday.id },
      data: { status: input.status, notes: input.notes, photoUrl: input.photoUrl ?? existingToday.photoUrl },
    });
    return { check, wasUpdate: true };
  }

  const check = await prisma.treeHealthCheck.create({
    data: { plantedTreeId: tree.id, status: input.status, notes: input.notes, photoUrl: input.photoUrl },
  });
  return { check, wasUpdate: false };
}

export async function logBulkHealthChecks(
  prisma: PrismaClient,
  ngoUserId: string,
  input: { plantedTreeIds: string[]; status: ActionableHealthStatus; notes?: string },
) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  const owned = await prisma.plantedTree.findMany({
    where: { id: { in: input.plantedTreeIds }, ngoId: ngo.id },
    select: { id: true },
  });
  if (owned.length === 0) throw new NotFoundError('No matching planted trees found');

  await prisma.treeHealthCheck.createMany({
    data: owned.map((t) => ({ plantedTreeId: t.id, status: input.status, notes: input.notes })),
  });

  return { updatedCount: owned.length };
}

// Latest-status-per-tree aggregation — never a raw count of all health-check
// rows (a tree can be checked many times), only each tree's most recent status.
// Takes ngoId directly so it's reusable by both the owner dashboard route
// (after resolving ngoId from the caller's userId) and the public profile route.
export async function computeSurvivalStats(
  prisma: PrismaClient,
  ngoId: string,
  filter: { driveId?: string; zoneId?: string | null } = {},
) {
  const trees = await prisma.plantedTree.findMany({
    where: {
      ngoId,
      ...(filter.driveId ? { driveId: filter.driveId } : {}),
      ...(filter.zoneId !== undefined ? { zoneId: filter.zoneId } : {}),
    },
    select: { id: true },
  });

  const statusByTree = await getLatestStatusByTree(prisma, trees.map((t) => t.id));

  const counts: Record<TreeHealthStatus, number> = { not_checked: 0, healthy: 0, struggling: 0, dead: 0, removed: 0 };
  for (const tree of trees) counts[statusByTree.get(tree.id) ?? 'not_checked'] += 1;

  const total = trees.length;
  const survivalRate = total > 0 ? Math.round(((counts.healthy + counts.struggling) / total) * 1000) / 10 : 0;

  return { total, counts, survivalRate };
}

export async function getSurvivalStats(prisma: PrismaClient, ngoUserId: string, filter: { driveId?: string } = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  return computeSurvivalStats(prisma, ngo.id, filter);
}
