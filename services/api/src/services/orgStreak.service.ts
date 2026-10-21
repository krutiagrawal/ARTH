import { Prisma, PrismaClient, StreakProtectedBy } from '@arth/db';
import { addXp } from './xp.service';
import { startOfUtcDay, addDays, XP_STREAK_SAVE_COST, MAX_STREAK_FREEZES } from './streak.service';
import { BadRequestError } from '../utils/errors';

/**
 * NGO and nursery accounts keep a *weekly* streak: a Monday-anchored week counts as "met" if any
 * contribution row (post, drive, stock, order, lesson, …) or a freeze/XP `protection` row exists
 * for it. This service is the combined view over those rows plus freeze/revive, mirroring
 * streak.service.ts (which does the same per day for individuals). Freeze balance and XP live on
 * the org's `User` row, so no new counters are needed.
 */
type Db = Prisma.TransactionClient | PrismaClient;

export type OrgKind = 'ngo' | 'nursery';
export type OrgStreakState = 'safe' | 'at_risk' | 'broken';

/** One freeze is earned every this many consecutive met weeks, capped at MAX_STREAK_FREEZES. */
export const FREEZE_EARN_EVERY_WEEKS = 4;
const LOOKBACK_WEEKS = 104;

export function mondayOf(date: Date): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay(); // 0 = Sun .. 6 = Sat
  return addDays(d, day === 0 ? -6 : 1 - day);
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface Adapter {
  userId(db: Db, orgId: string): Promise<string>;
  metWeeks(db: Db, orgId: string, since: Date): Promise<Set<string>>;
  protectedCount(db: Db, orgId: string, by: StreakProtectedBy): Promise<number>;
  upsert(
    db: Db,
    orgId: string,
    streakType: string,
    periodStart: Date,
    data: { metCriteria: true; protectedBy?: StreakProtectedBy }
  ): Promise<void>;
}

function adapterFor(kind: OrgKind): Adapter {
  if (kind === 'ngo') {
    return {
      userId: async (db, id) => (await db.ngoProfile.findUniqueOrThrow({ where: { id }, select: { userId: true } })).userId,
      metWeeks: async (db, ngoId, since) => {
        const rows = await db.ngoContributionStreak.findMany({
          where: { ngoId, periodStart: { gte: since }, metCriteria: true },
          select: { periodStart: true },
        });
        return new Set(rows.map((r) => key(r.periodStart)));
      },
      protectedCount: (db, ngoId, by) => db.ngoContributionStreak.count({ where: { ngoId, protectedBy: by } }),
      upsert: async (db, ngoId, streakType, periodStart, data) => {
        const t = streakType as any;
        await db.ngoContributionStreak.upsert({
          where: { ngoId_streakType_periodStart: { ngoId, streakType: t, periodStart } },
          update: data,
          create: { ngoId, streakType: t, periodStart, ...data },
        });
      },
    };
  }
  return {
    userId: async (db, id) => (await db.nurseryProfile.findUniqueOrThrow({ where: { id }, select: { userId: true } })).userId,
    metWeeks: async (db, nurseryId, since) => {
      const rows = await db.nurseryContributionStreak.findMany({
        where: { nurseryId, periodStart: { gte: since }, metCriteria: true },
        select: { periodStart: true },
      });
      return new Set(rows.map((r) => key(r.periodStart)));
    },
    protectedCount: (db, nurseryId, by) => db.nurseryContributionStreak.count({ where: { nurseryId, protectedBy: by } }),
    upsert: async (db, nurseryId, streakType, periodStart, data) => {
      const t = streakType as any;
      await db.nurseryContributionStreak.upsert({
        where: { nurseryId_streakType_periodStart: { nurseryId, streakType: t, periodStart } },
        update: data,
        create: { nurseryId, streakType: t, periodStart, ...data },
      });
    },
  };
}

/** Consecutive met weeks ending at `end` (inclusive). */
function runEndingAt(met: Set<string>, end: Date): number {
  let n = 0;
  for (let c = end; met.has(key(c)); c = addDays(c, -7)) n += 1;
  return n;
}

/**
 * Current streak = run ending this week if it is already met, else the run ending last week – the
 * open week is not a miss yet, so the number doesn't drop to 0 every Monday.
 */
function summarise(met: Set<string>, thisWeek: Date) {
  const lastWeek = addDays(thisWeek, -7);
  const weekBefore = addDays(thisWeek, -14);
  const metThis = met.has(key(thisWeek));
  const metLast = met.has(key(lastWeek));

  const current = metThis ? runEndingAt(met, thisWeek) : metLast ? runEndingAt(met, lastWeek) : 0;
  const state: OrgStreakState = metThis ? 'safe' : metLast ? 'at_risk' : 'broken';

  const revivable = !metLast && met.has(key(weekBefore));
  const previousStreak = revivable ? runEndingAt(met, weekBefore) : 0;
  const restoredStreak = revivable ? previousStreak + 1 + (metThis ? runEndingAt(met, thisWeek) : 0) : current;

  let longest = 0;
  let run = 0;
  for (let w = LOOKBACK_WEEKS - 1; w >= 0; w--) {
    if (met.has(key(addDays(thisWeek, -w * 7)))) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  return { current, longest: Math.max(longest, current), state, revivable, previousStreak, restoredStreak, metThis, lastWeek };
}

export async function getOrgStreakStatus(db: Db, kind: OrgKind, orgId: string, weeksCount = 12) {
  const a = adapterFor(kind);
  const thisWeek = mondayOf(new Date());
  const met = await a.metWeeks(db, orgId, addDays(thisWeek, -(LOOKBACK_WEEKS - 1) * 7));
  const s = summarise(met, thisWeek);

  const userId = await a.userId(db, orgId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, streakFreezesAvailable: true } });

  const [freezesUsed, xpSavesUsed] = await Promise.all([a.protectedCount(db, orgId, 'freeze'), a.protectedCount(db, orgId, 'xp')]);

  const weeks = [];
  for (let w = weeksCount - 1; w >= 0; w--) {
    const start = addDays(thisWeek, -w * 7);
    weeks.push({ week: `Week ${weeksCount - w}`, met: met.has(key(start)) });
  }

  return {
    state: s.state,
    streakCurrent: s.current,
    streakMax: s.longest,
    revivable: s.revivable,
    previousStreak: s.previousStreak,
    restoredStreak: s.restoredStreak,
    reviveWeek: s.revivable ? key(s.lastWeek) : null,
    weeks,
    streakFreezesAvailable: user.streakFreezesAvailable,
    xp: user.xp,
    xpCost: XP_STREAK_SAVE_COST,
    freezesUsed,
    xpSavesUsed,
    freezeEarnEveryWeeks: FREEZE_EARN_EVERY_WEEKS,
    freezeCap: MAX_STREAK_FREEZES,
  };
}

/** Streak figures for dashboards that only need the number and the week grid. */
export async function getOrgStreakSummary(db: Db, kind: OrgKind, orgId: string, weeksCount = 12) {
  const { streakCurrent, streakMax, weeks } = await getOrgStreakStatus(db, kind, orgId, weeksCount);
  return { current: streakCurrent, longest: streakMax, weeks };
}

async function spend(tx: Prisma.TransactionClient, userId: string, method: 'freeze' | 'xp') {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (method === 'freeze') {
    if (user.streakFreezesAvailable <= 0) throw new BadRequestError('No streak freezes available');
    await tx.user.update({ where: { id: userId }, data: { streakFreezesAvailable: { decrement: 1 } } });
  } else {
    if (user.xp < XP_STREAK_SAVE_COST) throw new BadRequestError('Not enough XP');
    await addXp(tx, userId, -XP_STREAK_SAVE_COST, 'streak_saved_xp_spend');
  }
}

/** Buys back the single missed week (last week). Longer gaps can't be revived. */
export async function reviveOrgStreak(tx: Prisma.TransactionClient, kind: OrgKind, orgId: string, method: 'freeze' | 'xp') {
  const before = await getOrgStreakStatus(tx, kind, orgId);
  if (!before.revivable || !before.reviveWeek) throw new BadRequestError('There is no missed week to revive');
  const a = adapterFor(kind);
  await spend(tx, await a.userId(tx, orgId), method);
  await a.upsert(tx, orgId, 'protection', new Date(`${before.reviveWeek}T00:00:00.000Z`), { metCriteria: true, protectedBy: method });
  return getOrgStreakStatus(tx, kind, orgId);
}

/** Protects the current, still-open week so the streak survives it. */
export async function protectOrgWeek(tx: Prisma.TransactionClient, kind: OrgKind, orgId: string, method: 'freeze' | 'xp') {
  const before = await getOrgStreakStatus(tx, kind, orgId);
  if (before.state === 'safe') throw new BadRequestError('This week is already counted');
  const a = adapterFor(kind);
  await spend(tx, await a.userId(tx, orgId), method);
  await a.upsert(tx, orgId, 'protection', mondayOf(new Date()), { metCriteria: true, protectedBy: method });
  return getOrgStreakStatus(tx, kind, orgId);
}

/**
 * Marks this week met for each type and earns a freeze when the streak crosses a multiple of
 * FREEZE_EARN_EVERY_WEEKS. Shared by recordNgoContribution / recordNurseryContribution.
 */
export async function recordOrgContribution(tx: Prisma.TransactionClient, kind: OrgKind, orgId: string, types: string[]) {
  const a = adapterFor(kind);
  const thisWeek = mondayOf(new Date());
  const since = addDays(thisWeek, -(LOOKBACK_WEEKS - 1) * 7);
  const wasMet = (await a.metWeeks(tx, orgId, since)).has(key(thisWeek));

  for (const t of types) await a.upsert(tx, orgId, t, thisWeek, { metCriteria: true });
  if (wasMet) return;

  const after = summarise(await a.metWeeks(tx, orgId, since), thisWeek);
  // `after.current` includes this week; subtract it to get the run it extended.
  const prior = after.current - 1;
  if (Math.floor(after.current / FREEZE_EARN_EVERY_WEEKS) > Math.floor(prior / FREEZE_EARN_EVERY_WEEKS)) {
    const userId = await a.userId(tx, orgId);
    await tx.user.updateMany({
      where: { id: userId, streakFreezesAvailable: { lt: MAX_STREAK_FREEZES } },
      data: { streakFreezesAvailable: { increment: 1 } },
    });
  }
}
