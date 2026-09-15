import { Prisma, PrismaClient, NurseryStreakType, NurseryGrowthLevel } from '@plant/db';
import { startOfUtcDay, addDays } from './streak.service';

// Accepts either a live PrismaClient (read-only routes) or a transaction client (activity hooks) —
// every function here is a pure read/derive over existing tables plus, where noted, a write onto
// NurseryProfile.trustScore/growthLevel or NurseryContributionStreak.
type Db = Prisma.TransactionClient | PrismaClient;

// Mirrors nurseryAchievement.service.ts's MIN_ORDERS_FOR_RATE_CRITERIA — a brand-new nursery
// shouldn't read "100% fulfilment" off a single order, for the streak, the trust score, or badges.
const MIN_ORDERS_FOR_RATE_CRITERIA = 10;

const GROWTH_LEVEL_ORDER: NurseryGrowthLevel[] = ['seedling', 'growing', 'established', 'evergreen'];
// Both months-active AND lifetime-supplied must be met to advance a tier, so a brand-new but very
// active nursery doesn't jump straight to the top, and a long-tenured but inactive one doesn't
// either. Tunable defaults, not a hard product requirement.
const GROWTH_LEVEL_THRESHOLDS: { level: NurseryGrowthLevel; months: number; supplied: number }[] = [
  { level: 'growing', months: 3, supplied: 20 },
  { level: 'established', months: 12, supplied: 150 },
  { level: 'evergreen', months: 24, supplied: 500 },
];

const TRUST_WEIGHTS = { fulfilment: 0.35, rating: 0.25, inventoryFreshness: 0.2, responsiveness: 0.2 };
const TRUST_NEUTRAL_DEFAULT = 70;

function mondayOf(date: Date): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(d, diffToMonday);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------- Weekly contribution streaks (Supply / Inventory Freshness / ARTH Contribution) ----------

/** Marks this ISO week as met for each given streak type. Called from every activity hook (stock
 * create/update, order success, bulk-requirement fulfilled, reservation fulfilled, nursery post). */
export async function recordNurseryContribution(tx: Prisma.TransactionClient, nurseryId: string, types: NurseryStreakType[]) {
  const periodStart = mondayOf(new Date());
  for (const streakType of types) {
    await tx.nurseryContributionStreak.upsert({
      where: { nurseryId_streakType_periodStart: { nurseryId, streakType, periodStart } },
      update: { metCriteria: true },
      create: { nurseryId, streakType, periodStart, metCriteria: true },
    });
  }
}

interface WeeklyStreakStats {
  weeks: { week: string; met: boolean }[];
  current: number;
  longest: number;
}

async function getWeeklyStreakStats(db: Db, nurseryId: string, streakType: NurseryStreakType, weeksCount: number): Promise<WeeklyStreakStats> {
  const thisWeek = mondayOf(new Date());
  const startDate = addDays(thisWeek, -(weeksCount - 1) * 7);

  const rows = await db.nurseryContributionStreak.findMany({
    where: { nurseryId, streakType, periodStart: { gte: startDate } },
  });
  const metWeeks = new Set(rows.filter((r) => r.metCriteria).map((r) => dateKey(r.periodStart)));

  const weeks: { week: string; met: boolean }[] = [];
  for (let w = 0; w < weeksCount; w++) {
    const weekStart = addDays(startDate, w * 7);
    weeks.push({ week: `Week ${w + 1}`, met: metWeeks.has(dateKey(weekStart)) });
  }

  let current = 0;
  let cursor = thisWeek;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!metWeeks.has(dateKey(cursor))) break;
    current += 1;
    cursor = addDays(cursor, -7);
  }

  let longest = 0;
  let run = 0;
  for (const w of weeks) {
    if (w.met) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  return { weeks, current, longest: Math.max(longest, current) };
}

export async function getContributionStreakSummary(db: Db, nurseryId: string, weeksCount = 12) {
  const [supply, inventoryFreshness, arthContribution] = await Promise.all([
    getWeeklyStreakStats(db, nurseryId, 'supply', weeksCount),
    getWeeklyStreakStats(db, nurseryId, 'inventory_freshness', weeksCount),
    getWeeklyStreakStats(db, nurseryId, 'arth_contribution', weeksCount),
  ]);
  return { supply, inventoryFreshness, arthContribution };
}

/** The ARTH Contribution Streak's current-week count — what the `streak_days` achievement
 * criteria now reads (repointed from the removed daily NurseryProfile.streakCurrent). */
export async function getArthContributionStreakCurrent(db: Db, nurseryId: string): Promise<number> {
  const { current } = await getWeeklyStreakStats(db, nurseryId, 'arth_contribution', 104);
  return current;
}

// ---------- Fulfilment Streak (event-driven, not calendar-based) ----------

/** "Consecutive orders fulfilled without a nursery cancellation" — extracted from
 * nurseryAchievement.service.ts's cancellation_free_order_streak criteria so both the achievement
 * and the dashboard streak tile share one computation instead of drifting. */
export async function getFulfilmentStreakCurrent(db: Db, nurseryId: string): Promise<number> {
  const total = await db.order.count({ where: { nurseryId, status: { not: 'pending_payment' } } });
  if (total < MIN_ORDERS_FOR_RATE_CRITERIA) return 0;

  const lastCancelled = await db.order.findFirst({
    where: { nurseryId, status: 'cancelled' },
    orderBy: { cancelledAt: 'desc' },
    select: { cancelledAt: true },
  });

  return db.order.count({
    where: {
      nurseryId,
      status: { notIn: ['pending_payment', 'cancelled'] },
      ...(lastCancelled?.cancelledAt ? { createdAt: { gt: lastCancelled.cancelledAt } } : {}),
    },
  });
}

/** Recomputes the current fulfilment streak and bumps the persisted max if it's a new record.
 * Call from order pickup/delivery/cancellation transitions — the only events that can move it. */
export async function refreshFulfilmentStreak(tx: Prisma.TransactionClient, nurseryId: string) {
  const current = await getFulfilmentStreakCurrent(tx, nurseryId);
  const profile = await tx.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
  const max = Math.max(current, profile.fulfilmentStreakMax);
  if (max !== profile.fulfilmentStreakMax) {
    await tx.nurseryProfile.update({ where: { id: nurseryId }, data: { fulfilmentStreakMax: max } });
  }
  return { current, max };
}

// ---------- ARTH Trust Score ----------

async function getFulfilmentRatePct(db: Db, nurseryId: string): Promise<number | null> {
  const total = await db.order.count({ where: { nurseryId, status: { not: 'pending_payment' } } });
  if (total < MIN_ORDERS_FOR_RATE_CRITERIA) return null;
  const fulfilled = await db.order.count({ where: { nurseryId, status: { in: ['picked_up', 'delivered', 'plantation_verified'] } } });
  return Math.round((fulfilled / total) * 100);
}

function ratingSubScore(avgRating: Prisma.Decimal | number | string | null, reviewCount: number): number {
  if (!avgRating || reviewCount === 0) return TRUST_NEUTRAL_DEFAULT;
  const raw = (Number(avgRating) / 5) * 100;
  if (reviewCount >= 5) return Math.round(raw);
  // Taper toward the neutral baseline below a 5-review sample so one early review can't swing the
  // score wildly, same spirit as the order-count floor above.
  const weight = reviewCount / 5;
  return Math.round(raw * weight + TRUST_NEUTRAL_DEFAULT * (1 - weight));
}

async function inventoryFreshnessSubScore(db: Db, nurseryId: string): Promise<number> {
  const { weeks } = await getWeeklyStreakStats(db, nurseryId, 'inventory_freshness', 8);
  const metCount = weeks.filter((w) => w.met).length;
  return Math.round((metCount / weeks.length) * 100);
}

/** No messaging system exists to time-to-first-reply — the closest live proxy is how quickly a
 * nursery responds to an NGO's bulk sapling requirement. */
async function responsivenessSubScore(db: Db, nurseryId: string): Promise<number> {
  const responses = await db.bulkRequirementResponse.findMany({
    where: { nurseryId, respondedAt: { not: null } },
    select: { respondedAt: true, requirement: { select: { createdAt: true } } },
    orderBy: { respondedAt: 'desc' },
    take: 20,
  });
  if (responses.length === 0) return TRUST_NEUTRAL_DEFAULT;

  const hoursSorted = responses
    .map((r) => (r.respondedAt!.getTime() - r.requirement.createdAt.getTime()) / (60 * 60 * 1000))
    .sort((a, b) => a - b);
  const median = hoursSorted[Math.floor(hoursSorted.length / 2)];

  if (median <= 24) return 100;
  if (median <= 72) return 70;
  if (median <= 168) return 40;
  return 10;
}

export interface TrustScoreBreakdown {
  score: number | null;
  factors: { fulfilment: number; rating: number; inventoryFreshness: number; responsiveness: number } | null;
}

/** Only approved nurseries get a score — an unapproved one shows "Not yet verified" rather than a
 * partial-credit number. */
export async function computeTrustScore(db: Db, nurseryId: string): Promise<TrustScoreBreakdown> {
  const profile = await db.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
  if (profile.status !== 'approved') return { score: null, factors: null };

  const [fulfilmentPct, inventoryFreshness, responsiveness] = await Promise.all([
    getFulfilmentRatePct(db, nurseryId),
    inventoryFreshnessSubScore(db, nurseryId),
    responsivenessSubScore(db, nurseryId),
  ]);
  const fulfilment = fulfilmentPct ?? TRUST_NEUTRAL_DEFAULT;
  const rating = ratingSubScore(profile.avgRating, profile.reviewCount);

  const score = Math.round(
    fulfilment * TRUST_WEIGHTS.fulfilment +
      rating * TRUST_WEIGHTS.rating +
      inventoryFreshness * TRUST_WEIGHTS.inventoryFreshness +
      responsiveness * TRUST_WEIGHTS.responsiveness
  );

  return { score, factors: { fulfilment, rating, inventoryFreshness, responsiveness } };
}

// ---------- Growth Level (tenure + lifetime volume, independent of Trust Score) ----------

export interface GrowthLevelDetail {
  level: NurseryGrowthLevel;
  monthsActive: number;
  lifetimeSupplied: number;
  nextLevel: NurseryGrowthLevel | null;
  monthsToNext: number | null;
  suppliedToNext: number | null;
}

export async function getGrowthLevelDetail(db: Db, nurseryId: string): Promise<GrowthLevelDetail> {
  const profile = await db.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
  const monthsActive = profile.approvedAt ? (Date.now() - profile.approvedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;

  // Same "saplings that left the nursery through ARTH" count the saplings_supplied_via_arth
  // achievement uses — deliberately not adding bulk-requirement quantities on top, since bulk
  // fulfilment already issues these same ArthSaplingUnit rows (would double-count).
  const lifetimeSupplied = await db.arthSaplingUnit.count({ where: { nurseryId, status: { in: ['collected', 'planted'] } } });

  let level: NurseryGrowthLevel = 'seedling';
  for (const tier of GROWTH_LEVEL_THRESHOLDS) {
    if (monthsActive >= tier.months && lifetimeSupplied >= tier.supplied) level = tier.level;
  }

  const idx = GROWTH_LEVEL_ORDER.indexOf(level);
  const nextTier = GROWTH_LEVEL_THRESHOLDS[idx]; // thresholds array is 0-indexed one-ahead of GROWTH_LEVEL_ORDER (seedling has no entry)
  const nextLevel = nextTier?.level ?? null;

  return {
    level,
    monthsActive: Math.round(monthsActive * 10) / 10,
    lifetimeSupplied,
    nextLevel,
    monthsToNext: nextTier ? Math.max(0, Math.ceil(nextTier.months - monthsActive)) : null,
    suppliedToNext: nextTier ? Math.max(0, nextTier.supplied - lifetimeSupplied) : null,
  };
}

// ---------- Combined recompute + summary ----------

/** Recomputes and persists trustScore/growthLevel onto NurseryProfile — called inline at activity
 * hooks (immediate feedback) and by nurseryReputation.job.ts's weekly catch-up pass (time-based
 * factors like tenure/inventory-freshness decay can move the numbers with no new activity at all). */
export async function recomputeReputation(tx: Prisma.TransactionClient, nurseryId: string) {
  const [trust, growth] = await Promise.all([computeTrustScore(tx, nurseryId), getGrowthLevelDetail(tx, nurseryId)]);
  await tx.nurseryProfile.update({ where: { id: nurseryId }, data: { trustScore: trust.score, growthLevel: growth.level } });
  return { trustScore: trust.score, growthLevel: growth.level };
}

/** Full reputation payload for GET /nursery/reputation — trust score with factor breakdown (for
 * transparency in the UI), growth level with progress to the next tier, all 4 streaks. */
export async function getReputationSummary(db: Db, nurseryId: string, weeksCount = 12) {
  const [trust, growth, streaks, fulfilmentCurrent] = await Promise.all([
    computeTrustScore(db, nurseryId),
    getGrowthLevelDetail(db, nurseryId),
    getContributionStreakSummary(db, nurseryId, weeksCount),
    getFulfilmentStreakCurrent(db, nurseryId),
  ]);
  const profile = await db.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });

  return {
    trustScore: trust.score,
    trustScoreFactors: trust.factors,
    growthLevel: growth.level,
    growthProgress: {
      monthsActive: growth.monthsActive,
      lifetimeSupplied: growth.lifetimeSupplied,
      nextLevel: growth.nextLevel,
      monthsToNext: growth.monthsToNext,
      suppliedToNext: growth.suppliedToNext,
    },
    fulfilmentStreak: { current: fulfilmentCurrent, max: profile.fulfilmentStreakMax },
    streaks,
  };
}
