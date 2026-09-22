import { PrismaClient, TreeHealthStatus } from '@plant/db';
import { ConflictError, NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { ActionableHealthStatus, getLatestStatusByTree, logBulkHealthChecks } from './plantedTree.service';

const MILESTONE_DAYS = [30, 90, 180, 365];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ZoneRollup {
  total: number;
  counts: Record<TreeHealthStatus, number>;
  survivalRate: number;
  lastCheckedAt: Date | null;
  nextCheckDue: Date | null;
}

function emptyRollup(): ZoneRollup {
  return {
    total: 0,
    counts: { not_checked: 0, healthy: 0, struggling: 0, dead: 0, removed: 0 },
    survivalRate: 0,
    lastCheckedAt: null,
    nextCheckDue: null,
  };
}

// Next of the 30/90/180/365-day-since-planting milestones that hasn't passed yet, measured from
// the earliest tree in the group. Once all four are behind us, the 365-day mark is returned as
// the (overdue) reference point — there's no "no more checks needed" state.
function computeNextCheckDue(earliestPlantedAt: Date): Date {
  const now = Date.now();
  const plantedMs = earliestPlantedAt.getTime();
  for (const days of MILESTONE_DAYS) {
    const due = plantedMs + days * MS_PER_DAY;
    if (due >= now) return new Date(due);
  }
  return new Date(plantedMs + MILESTONE_DAYS[MILESTONE_DAYS.length - 1] * MS_PER_DAY);
}

function rollupGroup(trees: { id: string; plantedAt: Date }[], statusByTree: Map<string, TreeHealthStatus>, lastCheckedByTree: Map<string, Date>): ZoneRollup {
  if (trees.length === 0) return emptyRollup();

  const counts: Record<TreeHealthStatus, number> = { not_checked: 0, healthy: 0, struggling: 0, dead: 0, removed: 0 };
  let lastCheckedAt: Date | null = null;
  let earliestPlantedAt = trees[0].plantedAt;

  for (const tree of trees) {
    counts[statusByTree.get(tree.id) ?? 'not_checked'] += 1;
    const checkedAt = lastCheckedByTree.get(tree.id);
    if (checkedAt && (!lastCheckedAt || checkedAt > lastCheckedAt)) lastCheckedAt = checkedAt;
    if (tree.plantedAt < earliestPlantedAt) earliestPlantedAt = tree.plantedAt;
  }

  const total = trees.length;
  const survivalRate = Math.round(((counts.healthy + counts.struggling) / total) * 1000) / 10;

  return { total, counts, survivalRate, lastCheckedAt, nextCheckDue: computeNextCheckDue(earliestPlantedAt) };
}

// One batched query for every tree + health check under a drive, then grouped in memory per
// zone — avoids an N+1 query per zone when a plantation has dozens of them.
async function rollupsByZone(prisma: PrismaClient, driveId: string) {
  const trees = await prisma.plantedTree.findMany({
    where: { driveId },
    select: { id: true, zoneId: true, plantedAt: true },
  });
  const treeIds = trees.map((t) => t.id);

  const [statusByTree, checks] = await Promise.all([
    getLatestStatusByTree(prisma, treeIds),
    treeIds.length === 0
      ? Promise.resolve([])
      : prisma.treeHealthCheck.findMany({
          where: { plantedTreeId: { in: treeIds } },
          orderBy: { checkedAt: 'desc' },
          select: { plantedTreeId: true, checkedAt: true },
        }),
  ]);

  const lastCheckedByTree = new Map<string, Date>();
  for (const c of checks) {
    if (!lastCheckedByTree.has(c.plantedTreeId)) lastCheckedByTree.set(c.plantedTreeId, c.checkedAt);
  }

  const byZone = new Map<string, { id: string; plantedAt: Date }[]>();
  for (const tree of trees) {
    const key = tree.zoneId ?? 'unzoned';
    if (!byZone.has(key)) byZone.set(key, []);
    byZone.get(key)!.push({ id: tree.id, plantedAt: tree.plantedAt });
  }

  return { byZone, statusByTree, lastCheckedByTree };
}

async function requireOwnedDrive(prisma: PrismaClient, ngoId: string, driveId: string) {
  const drive = await prisma.drive.findFirst({ where: { id: driveId, ngoId } });
  if (!drive) throw new NotFoundError('Drive not found');
  return drive;
}

export async function createZone(prisma: PrismaClient, ngoUserId: string, input: { driveId: string; name: string }) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  await requireOwnedDrive(prisma, ngo.id, input.driveId);

  const name = input.name.trim();
  const existing = await prisma.plantationZone.findFirst({ where: { driveId: input.driveId, name } });
  if (existing) throw new ConflictError('A zone with this name already exists for this plantation');

  return prisma.plantationZone.create({ data: { ngoId: ngo.id, driveId: input.driveId, name } });
}

export async function renameZone(prisma: PrismaClient, ngoUserId: string, zoneId: string, name: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const zone = await prisma.plantationZone.findFirst({ where: { id: zoneId, ngoId: ngo.id } });
  if (!zone) throw new NotFoundError('Zone not found');

  const trimmed = name.trim();
  const existing = await prisma.plantationZone.findFirst({ where: { driveId: zone.driveId, name: trimmed, id: { not: zoneId } } });
  if (existing) throw new ConflictError('A zone with this name already exists for this plantation');

  return prisma.plantationZone.update({ where: { id: zoneId }, data: { name: trimmed } });
}

// A zone is an organizational label, not a data owner — deleting it unzones its trees rather
// than touching PlantedTree/TreeHealthCheck rows.
export async function deleteZone(prisma: PrismaClient, ngoUserId: string, zoneId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const zone = await prisma.plantationZone.findFirst({ where: { id: zoneId, ngoId: ngo.id } });
  if (!zone) throw new NotFoundError('Zone not found');

  await prisma.$transaction([
    prisma.plantedTree.updateMany({ where: { zoneId }, data: { zoneId: null } }),
    prisma.plantationZone.delete({ where: { id: zoneId } }),
  ]);
}

export async function listZonesForDrive(prisma: PrismaClient, ngoUserId: string, driveId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const drive = await requireOwnedDrive(prisma, ngo.id, driveId);

  const [zones, { byZone, statusByTree, lastCheckedByTree }] = await Promise.all([
    prisma.plantationZone.findMany({ where: { driveId }, orderBy: { createdAt: 'asc' } }),
    rollupsByZone(prisma, driveId),
  ]);

  const zoneRows = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    driveId: zone.driveId,
    ...rollupGroup(byZone.get(zone.id) ?? [], statusByTree, lastCheckedByTree),
  }));

  const unzonedTrees = byZone.get('unzoned') ?? [];
  const unzoned =
    unzonedTrees.length > 0
      ? { id: null, name: 'Unzoned', driveId, ...rollupGroup(unzonedTrees, statusByTree, lastCheckedByTree) }
      : null;

  return { drive: { id: drive.id, title: drive.title }, zones: zoneRows, unzoned };
}

export async function getZoneDetail(prisma: PrismaClient, ngoUserId: string, zoneId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const zone = await prisma.plantationZone.findFirst({ where: { id: zoneId, ngoId: ngo.id } });
  if (!zone) throw new NotFoundError('Zone not found');

  const { byZone, statusByTree, lastCheckedByTree } = await rollupsByZone(prisma, zone.driveId);
  const rollup = rollupGroup(byZone.get(zone.id) ?? [], statusByTree, lastCheckedByTree);

  return { id: zone.id, name: zone.name, driveId: zone.driveId, ...rollup };
}

export async function getPlantationsOverview(prisma: PrismaClient, ngoUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);

  const drives = await prisma.drive.findMany({
    where: { ngoId: ngo.id, plantedTrees: { some: {} } },
    select: { id: true, title: true, _count: { select: { zones: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    drives.map(async (drive) => {
      const { byZone, statusByTree, lastCheckedByTree } = await rollupsByZone(prisma, drive.id);
      const allTrees = Array.from(byZone.values()).flat();
      return {
        driveId: drive.id,
        driveTitle: drive.title,
        zoneCount: drive._count.zones,
        ...rollupGroup(allTrees, statusByTree, lastCheckedByTree),
      };
    }),
  );
}

// Marks every tree currently in a zone with one health status in a single bulk write — the
// primary "check 500 trees in one tap" action. Delegates to the existing per-tree-id bulk
// endpoint so the exception-flow and zone-flow write through the exact same code path.
export async function bulkMarkZoneHealth(prisma: PrismaClient, ngoUserId: string, zoneId: string, status: ActionableHealthStatus, notes?: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const zone = await prisma.plantationZone.findFirst({ where: { id: zoneId, ngoId: ngo.id } });
  if (!zone) throw new NotFoundError('Zone not found');

  const trees = await prisma.plantedTree.findMany({ where: { zoneId }, select: { id: true } });
  if (trees.length === 0) throw new NotFoundError('This zone has no trees to check');

  return logBulkHealthChecks(prisma, ngoUserId, { plantedTreeIds: trees.map((t) => t.id), status, notes });
}
