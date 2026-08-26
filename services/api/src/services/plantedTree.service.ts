import { PrismaClient, TreeHealthStatus } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';

interface BulkCreateInput {
  driveId?: string;
  speciesName: string;
  count: number;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
}

interface ListFilter {
  driveId?: string;
  speciesName?: string;
  page?: number;
  take?: number;
}

// Latest status per tree, in one query — orders all matching health checks by
// recency and keeps only the first (most recent) row seen per plantedTreeId.
async function getLatestStatusByTree(prisma: PrismaClient, plantedTreeIds: string[]) {
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

// Creates `count` individual PlantedTree rows in one call (NGOs realistically
// plant in the hundreds) and auto-creates one 'healthy' health-check per tree
// at plant time, so every tree always has at least one status.
export async function bulkCreatePlantedTrees(prisma: PrismaClient, ngoUserId: string, input: BulkCreateInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.plantedTree.createManyAndReturn({
      data: Array.from({ length: input.count }, () => ({
        ngoId: ngo.id,
        driveId: input.driveId,
        speciesName: input.speciesName,
        locationLabel: input.locationLabel,
        lat: input.lat,
        lng: input.lng,
        photoUrl: input.photoUrl,
      })),
    });

    await tx.treeHealthCheck.createMany({
      data: created.map((t) => ({ plantedTreeId: t.id, status: 'healthy' as const })),
    });

    return { createdCount: created.length, plantedTreeIds: created.map((t) => t.id) };
  });
}

export async function listOwnPlantedTrees(prisma: PrismaClient, ngoUserId: string, filter: ListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 200);
  const page = Math.max(filter.page ?? 1, 1);

  const [trees, total] = await Promise.all([
    prisma.plantedTree.findMany({
      where: {
        ngoId: ngo.id,
        ...(filter.driveId ? { driveId: filter.driveId } : {}),
        ...(filter.speciesName ? { speciesName: { contains: filter.speciesName, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { plantedAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: { drive: { select: { id: true, title: true } } },
    }),
    prisma.plantedTree.count({
      where: {
        ngoId: ngo.id,
        ...(filter.driveId ? { driveId: filter.driveId } : {}),
        ...(filter.speciesName ? { speciesName: { contains: filter.speciesName, mode: 'insensitive' as const } } : {}),
      },
    }),
  ]);

  const statusByTree = await getLatestStatusByTree(prisma, trees.map((t) => t.id));

  return {
    total,
    trees: trees.map((t) => ({ ...t, latestStatus: statusByTree.get(t.id) ?? 'healthy' })),
  };
}

async function findOwnedPlantedTreeOrThrow(prisma: PrismaClient, ngoUserId: string, plantedTreeId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const tree = await prisma.plantedTree.findFirst({ where: { id: plantedTreeId, ngoId: ngo.id } });
  if (!tree) throw new NotFoundError('Planted tree not found');
  return tree;
}

export async function logHealthCheck(
  prisma: PrismaClient,
  ngoUserId: string,
  plantedTreeId: string,
  input: { status: TreeHealthStatus; notes?: string; photoUrl?: string },
) {
  const tree = await findOwnedPlantedTreeOrThrow(prisma, ngoUserId, plantedTreeId);
  return prisma.treeHealthCheck.create({
    data: { plantedTreeId: tree.id, status: input.status, notes: input.notes, photoUrl: input.photoUrl },
  });
}

export async function logBulkHealthChecks(
  prisma: PrismaClient,
  ngoUserId: string,
  input: { plantedTreeIds: string[]; status: TreeHealthStatus; notes?: string },
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
export async function computeSurvivalStats(prisma: PrismaClient, ngoId: string, filter: { driveId?: string } = {}) {
  const trees = await prisma.plantedTree.findMany({
    where: { ngoId, ...(filter.driveId ? { driveId: filter.driveId } : {}) },
    select: { id: true },
  });

  const statusByTree = await getLatestStatusByTree(prisma, trees.map((t) => t.id));

  const counts: Record<TreeHealthStatus, number> = { healthy: 0, struggling: 0, dead: 0, removed: 0 };
  for (const status of statusByTree.values()) counts[status] += 1;

  const total = trees.length;
  const survivalRate = total > 0 ? Math.round(((counts.healthy + counts.struggling) / total) * 1000) / 10 : 0;

  return { total, counts, survivalRate };
}

export async function getSurvivalStats(prisma: PrismaClient, ngoUserId: string, filter: { driveId?: string } = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  return computeSurvivalStats(prisma, ngo.id, filter);
}
