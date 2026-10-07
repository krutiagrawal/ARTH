import type { Prisma, PrismaClient } from '@arth/db';
import { countsTowardImpact, estimateTreeImpact, round1, type ImpactConfidence } from '../lib/treeImpact';
import { getLatestStatusByTree } from './plantedTree.service';

// Accepts a transaction client too, so achievement checks inside a transaction see the same numbers.
type Db = PrismaClient | Prisma.TransactionClient;

export interface ImpactTotals {
  co2Kg: number;
  oxygenKg: number;
  treesCounted: number;
  /** 'low' if any counted tree is a palm/bamboo/shrub or a species outside the growth table. */
  confidence: ImpactConfidence;
}

const EMPTY: ImpactTotals = { co2Kg: 0, oxygenKg: 0, treesCounted: 0, confidence: 'medium' };

function accumulate(
  totals: { co2: number; o2: number; n: number; low: boolean },
  ref: { key?: string | null; name?: string | null },
  plantedAt: Date,
  now: Date,
) {
  const e = estimateTreeImpact(ref, plantedAt, now);
  totals.co2 += e.co2Kg;
  totals.o2 += e.oxygenKg;
  totals.n += 1;
  if (e.confidence === 'low') totals.low = true;
}

function finish(t: { co2: number; o2: number; n: number; low: boolean }): ImpactTotals {
  return { co2Kg: round1(t.co2), oxygenKg: round1(t.o2), treesCounted: t.n, confidence: t.low ? 'low' : 'medium' };
}

/** Only trees whose photo passed verification (or an admin approved) count, matching when XP is awarded. */
const COUNTED_INDIVIDUAL_TREE = { isDeleted: false, aiVerificationStatus: 'verified' as const };

export async function getUserImpact(db: Db, userId: string, now = new Date()): Promise<ImpactTotals> {
  const trees = await db.tree.findMany({
    where: { userId, ...COUNTED_INDIVIDUAL_TREE },
    select: { plantedAt: true, healthStatus: true, species: { select: { key: true, commonName: true } } },
  });
  const t = { co2: 0, o2: 0, n: 0, low: false };
  for (const tree of trees) {
    if (!countsTowardImpact(tree.healthStatus)) continue;
    accumulate(t, { key: tree.species.key, name: tree.species.commonName }, tree.plantedAt, now);
  }
  return finish(t);
}

/** Per-user CO2 for many users in one query (group totals). */
export async function getUsersCo2Kg(db: Db, userIds: string[], now = new Date()): Promise<number> {
  if (userIds.length === 0) return 0;
  const trees = await db.tree.findMany({
    where: { userId: { in: userIds }, ...COUNTED_INDIVIDUAL_TREE },
    select: { plantedAt: true, healthStatus: true, species: { select: { key: true, commonName: true } } },
  });
  let co2 = 0;
  for (const tree of trees) {
    if (!countsTowardImpact(tree.healthStatus)) continue;
    co2 += estimateTreeImpact({ key: tree.species.key, name: tree.species.commonName }, tree.plantedAt, now).co2Kg;
  }
  return round1(co2);
}

/**
 * Re-derives the user's stored CO2 figure from their trees' current ages. The column is only a
 * cache now: trees keep growing, so it is refreshed whenever the profile is read and whenever a
 * planting is confirmed, rather than written once at planting time.
 */
export async function refreshUserCo2(db: Db, userId: string): Promise<number> {
  const { co2Kg } = await getUserImpact(db, userId);
  await db.user.update({ where: { id: userId }, data: { totalCo2Absorbed: co2Kg } });
  return co2Kg;
}

export async function getNurseryImpactTotals(db: Db, nurseryId: string, now = new Date()): Promise<ImpactTotals> {
  const trees = await db.tree.findMany({
    where: { nurseryId, ...COUNTED_INDIVIDUAL_TREE },
    select: { plantedAt: true, healthStatus: true, species: { select: { key: true, commonName: true } } },
  });
  const t = { co2: 0, o2: 0, n: 0, low: false };
  for (const tree of trees) {
    if (!countsTowardImpact(tree.healthStatus)) continue;
    accumulate(t, { key: tree.species.key, name: tree.species.commonName }, tree.plantedAt, now);
  }
  return trees.length === 0 ? EMPTY : finish(t);
}

/**
 * An NGO's impact: every tree it has logged as planted (not dead/removed per the latest health
 * check), plus adopted listings that aren't backed by a logged planting. Those listings have no
 * planting date, so the listing date stands in; that is a lower bound, since the tree is at least
 * that old.
 */
export async function getNgoImpactTotals(prisma: PrismaClient, ngoId: string, now = new Date()): Promise<ImpactTotals> {
  const [planted, orphanListings] = await Promise.all([
    prisma.plantedTree.findMany({ where: { ngoId }, select: { id: true, speciesName: true, plantedAt: true } }),
    prisma.adoptableTree.findMany({
      where: { ngoId, status: 'adopted', plantedTreeId: null },
      select: { speciesName: true, createdAt: true },
    }),
  ]);
  const statusByTree = await getLatestStatusByTree(prisma, planted.map((p) => p.id));

  const t = { co2: 0, o2: 0, n: 0, low: false };
  for (const tree of planted) {
    if (!countsTowardImpact(statusByTree.get(tree.id))) continue;
    accumulate(t, { name: tree.speciesName }, tree.plantedAt, now);
  }
  for (const listing of orphanListings) accumulate(t, { name: listing.speciesName }, listing.createdAt, now);
  return finish(t);
}
