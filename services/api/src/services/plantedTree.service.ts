import { PrismaClient, TreeHealthStatus } from '@plant/db';

// 'not_checked' is a derived absence-of-check state, never something you can actually log a
// health check as — the routes' zod schemas already restrict incoming status to these four.
export type ActionableHealthStatus = Exclude<TreeHealthStatus, 'not_checked'>;
import { BadRequestError, NotFoundError } from '../utils/errors';
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
}

interface ListFilter {
  driveId?: string;
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

  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  if (input.zoneId) {
    const zone = await prisma.plantationZone.findFirst({ where: { id: input.zoneId, ngoId: ngo.id, driveId: input.driveId } });
    if (!zone) throw new NotFoundError('Zone not found');
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.plantedTree.createManyAndReturn({
      data: Array.from({ length: input.count }, () => ({
        ngoId: ngo.id,
        driveId: input.driveId,
        zoneId: input.zoneId,
        speciesName: input.speciesName,
        locationLabel: input.locationLabel,
        lat: input.lat,
        lng: input.lng,
        photoUrl: input.photoUrl,
      })),
    });

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
    ...(filter.driveId ? { driveId: filter.driveId } : {}),
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

export async function logHealthCheck(
  prisma: PrismaClient,
  ngoUserId: string,
  plantedTreeId: string,
  input: { status: ActionableHealthStatus; notes?: string; photoUrl?: string },
) {
  const tree = await findOwnedPlantedTreeOrThrow(prisma, ngoUserId, plantedTreeId);
  return prisma.treeHealthCheck.create({
    data: { plantedTreeId: tree.id, status: input.status, notes: input.notes, photoUrl: input.photoUrl },
  });
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
