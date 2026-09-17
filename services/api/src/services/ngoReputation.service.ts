import { Prisma, PrismaClient, NgoStreakType, NgoGrowthLevel } from '@plant/db';
import { startOfUtcDay, addDays } from './streak.service';
import { notify } from './notification.service';

// Accepts either a live PrismaClient (read-only routes) or a transaction client (activity hooks) —
// every function here is a pure read/derive over existing tables plus, where noted, a write onto
// NgoProfile.trustScore/growthLevel or NgoContributionStreak. Mirrors nurseryReputation.service.ts.
type Db = Prisma.TransactionClient | PrismaClient;

// A brand-new NGO shouldn't read "100% drive completion" off a single drive.
const MIN_DRIVES_FOR_RATE_CRITERIA = 5;

const GROWTH_LEVEL_ORDER: NgoGrowthLevel[] = ['seedling', 'growing', 'established', 'evergreen'];
// Both months-active AND lifetime-trees-planted must be met to advance a tier — mirrors
// nurseryReputation.service.ts's GROWTH_LEVEL_THRESHOLDS (months + lifetime volume), scaled to
// what an NGO's own drives realistically plant rather than a nursery's supply chain.
const GROWTH_LEVEL_THRESHOLDS: { level: NgoGrowthLevel; months: number; treesPlanted: number }[] = [
  { level: 'growing', months: 3, treesPlanted: 50 },
  { level: 'established', months: 12, treesPlanted: 300 },
  { level: 'evergreen', months: 24, treesPlanted: 1000 },
];

const TRUST_WEIGHTS = { driveCompletion: 0.4, updateFreshness: 0.3, complianceCompleteness: 0.3 };
const TRUST_NEUTRAL_DEFAULT = 70;

// The Zod-validated-but-optional KYC fields that make an NGO's registration verifiable —
// deliberately not every KYC field (office bearers, work history, etc. don't affect trust).
const COMPLIANCE_CHECKLIST_FIELDS = [
  'registrationNumber',
  'panNumber',
  'ngoDarpanId',
  'twelveARegistrationNumber',
  'eightyGRegistrationNumber',
  'fcraRegistrationNumber',
] as const;

function mondayOf(date: Date): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(d, diffToMonday);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------- Weekly contribution streaks (Updates / Drive Activity / Impact Verification) ----------

/** Marks this ISO week as met for each given streak type. Called from every activity hook (update
 * posted, drive created/completed, planted trees logged, drive attendance recorded). */
export async function recordNgoContribution(tx: Prisma.TransactionClient, ngoId: string, types: NgoStreakType[]) {
  const periodStart = mondayOf(new Date());
  for (const streakType of types) {
    await tx.ngoContributionStreak.upsert({
      where: { ngoId_streakType_periodStart: { ngoId, streakType, periodStart } },
      update: { metCriteria: true },
      create: { ngoId, streakType, periodStart, metCriteria: true },
    });
  }
}

interface WeeklyStreakStats {
  weeks: { week: string; met: boolean }[];
  current: number;
  longest: number;
}

async function getWeeklyStreakStats(db: Db, ngoId: string, streakType: NgoStreakType, weeksCount: number): Promise<WeeklyStreakStats> {
  const thisWeek = mondayOf(new Date());
  const startDate = addDays(thisWeek, -(weeksCount - 1) * 7);

  const rows = await db.ngoContributionStreak.findMany({
    where: { ngoId, streakType, periodStart: { gte: startDate } },
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

export async function getContributionStreakSummary(db: Db, ngoId: string, weeksCount = 12) {
  const [updates, driveActivity, impactVerification] = await Promise.all([
    getWeeklyStreakStats(db, ngoId, 'updates', weeksCount),
    getWeeklyStreakStats(db, ngoId, 'drive_activity', weeksCount),
    getWeeklyStreakStats(db, ngoId, 'impact_verification', weeksCount),
  ]);
  return { updates, driveActivity, impactVerification };
}

/** The Updates Streak's current-week count — what the `streak_weeks` achievement criteria now
 * reads (repointed from the removed NgoProfile.streakCurrent). */
export async function getUpdatesStreakCurrent(db: Db, ngoId: string): Promise<number> {
  const { current } = await getWeeklyStreakStats(db, ngoId, 'updates', 104);
  return current;
}

// ---------- ARTH Trust Score ----------

async function getDriveCompletionRatePct(db: Db, ngoId: string): Promise<number | null> {
  const resolved = await db.drive.count({ where: { ngoId, status: { in: ['completed', 'cancelled'] } } });
  if (resolved < MIN_DRIVES_FOR_RATE_CRITERIA) return null;
  const completed = await db.drive.count({ where: { ngoId, status: 'completed' } });
  return Math.round((completed / resolved) * 100);
}

async function updateFreshnessSubScore(db: Db, ngoId: string): Promise<number> {
  const { weeks } = await getWeeklyStreakStats(db, ngoId, 'updates', 8);
  const metCount = weeks.filter((w) => w.met).length;
  return Math.round((metCount / weeks.length) * 100);
}

function complianceCompletenessSubScore(profile: Record<string, unknown>): number {
  const filled = COMPLIANCE_CHECKLIST_FIELDS.filter((field) => Boolean(profile[field])).length;
  return Math.round((filled / COMPLIANCE_CHECKLIST_FIELDS.length) * 100);
}

export interface NgoTrustScoreBreakdown {
  score: number | null;
  factors: { driveCompletion: number; updateFreshness: number; complianceCompleteness: number } | null;
}

/** Only approved NGOs get a score — an unapproved one shows "Not yet verified" rather than a
 * partial-credit number. Mirrors nurseryReputation.service.ts's computeTrustScore. */
export async function computeTrustScore(db: Db, ngoId: string): Promise<NgoTrustScoreBreakdown> {
  const profile = await db.ngoProfile.findUniqueOrThrow({ where: { id: ngoId } });
  if (profile.status !== 'approved') return { score: null, factors: null };

  const [driveCompletionPct, updateFreshness] = await Promise.all([
    getDriveCompletionRatePct(db, ngoId),
    updateFreshnessSubScore(db, ngoId),
  ]);
  const driveCompletion = driveCompletionPct ?? TRUST_NEUTRAL_DEFAULT;
  const complianceCompleteness = complianceCompletenessSubScore(profile as unknown as Record<string, unknown>);

  const score = Math.round(
    driveCompletion * TRUST_WEIGHTS.driveCompletion +
      updateFreshness * TRUST_WEIGHTS.updateFreshness +
      complianceCompleteness * TRUST_WEIGHTS.complianceCompleteness
  );

  return { score, factors: { driveCompletion, updateFreshness, complianceCompleteness } };
}

// ---------- Growth Level (tenure + lifetime impact, independent of Trust Score) ----------

export interface NgoGrowthLevelDetail {
  level: NgoGrowthLevel;
  monthsActive: number;
  lifetimeTreesPlanted: number;
  nextLevel: NgoGrowthLevel | null;
  monthsToNext: number | null;
  treesToNext: number | null;
}

export async function getGrowthLevelDetail(db: Db, ngoId: string): Promise<NgoGrowthLevelDetail> {
  const profile = await db.ngoProfile.findUniqueOrThrow({ where: { id: ngoId } });
  const monthsActive = profile.approvedAt ? (Date.now() - profile.approvedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;

  const lifetimeTreesPlanted = await db.plantedTree.count({ where: { ngoId } });

  let level: NgoGrowthLevel = 'seedling';
  for (const tier of GROWTH_LEVEL_THRESHOLDS) {
    if (monthsActive >= tier.months && lifetimeTreesPlanted >= tier.treesPlanted) level = tier.level;
  }

  const idx = GROWTH_LEVEL_ORDER.indexOf(level);
  const nextTier = GROWTH_LEVEL_THRESHOLDS[idx]; // thresholds array is 0-indexed one-ahead of GROWTH_LEVEL_ORDER (seedling has no entry)
  const nextLevel = nextTier?.level ?? null;

  return {
    level,
    monthsActive: Math.round(monthsActive * 10) / 10,
    lifetimeTreesPlanted,
    nextLevel,
    monthsToNext: nextTier ? Math.max(0, Math.ceil(nextTier.months - monthsActive)) : null,
    treesToNext: nextTier ? Math.max(0, nextTier.treesPlanted - lifetimeTreesPlanted) : null,
  };
}

// ---------- Combined recompute + summary ----------

/** Recomputes and persists trustScore/growthLevel onto NgoProfile — called inline at activity
 * hooks (immediate feedback) and by ngoReputation.job.ts's weekly catch-up pass (time-based
 * factors like tenure/update-freshness decay can move the numbers with no new activity at all). */
export async function recomputeReputation(tx: Prisma.TransactionClient, ngoId: string) {
  const before = await tx.ngoProfile.findUniqueOrThrow({ where: { id: ngoId }, select: { growthLevel: true, userId: true, orgName: true } });
  const [trust, growth] = await Promise.all([computeTrustScore(tx, ngoId), getGrowthLevelDetail(tx, ngoId)]);
  await tx.ngoProfile.update({ where: { id: ngoId }, data: { trustScore: trust.score, growthLevel: growth.level } });

  if (GROWTH_LEVEL_ORDER.indexOf(growth.level) > GROWTH_LEVEL_ORDER.indexOf(before.growthLevel)) {
    await notify(tx as unknown as PrismaClient, {
      userId: before.userId,
      type: 'ngo_impact_milestone',
      data: { growthLevel: growth.level },
      push: { title: `You've grown to ${growth.level}! 🌳`, body: `${before.orgName} just reached the ${growth.level} tier.` },
    });
  }

  return { trustScore: trust.score, growthLevel: growth.level };
}

/** Full reputation payload for GET /ngo/reputation — trust score with factor breakdown (for
 * transparency in the UI), growth level with progress to the next tier, all 3 streaks. */
export async function getReputationSummary(db: Db, ngoId: string, weeksCount = 12) {
  const [trust, growth, streaks] = await Promise.all([
    computeTrustScore(db, ngoId),
    getGrowthLevelDetail(db, ngoId),
    getContributionStreakSummary(db, ngoId, weeksCount),
  ]);

  return {
    trustScore: trust.score,
    trustScoreFactors: trust.factors,
    growthLevel: growth.level,
    growthProgress: {
      monthsActive: growth.monthsActive,
      lifetimeTreesPlanted: growth.lifetimeTreesPlanted,
      nextLevel: growth.nextLevel,
      monthsToNext: growth.monthsToNext,
      treesToNext: growth.treesToNext,
    },
    streaks,
  };
}
