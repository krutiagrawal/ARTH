import { Prisma, StreakProtectedBy } from '@arth/db';
import { addXp } from './xp.service';
import { BadRequestError } from '../utils/errors';

export const XP_STREAK_SAVE_COST = 100;
/** Every this many streak days earns one streak freeze… */
export const FREEZE_EARN_EVERY_DAYS = 7;
/** …up to this many held at once (new users start with 2). */
export const MAX_STREAK_FREEZES = 3;
const STATUS_LOOKBACK_DAYS = 400;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * First day (a Monday) of the streak calendar's window: `weeksCount` Monday-anchored weeks, the
 * last one being the current week. The grid's columns are labelled Mon..Sun, so rows must start
 * on a Monday for a cell's column to match its real weekday. Days after `today` in the last
 * week are simply future (never active).
 */
export function calendarStartDate(today: Date, weeksCount: number): Date {
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return addDays(today, -(daysSinceMonday + (weeksCount - 1) * 7));
}

/** A day keeps the streak alive if the user planted a tree or finished a daily game. */
export function isActiveDay(row: { planted: boolean; gamePlayed: boolean }): boolean {
  return row.planted || row.gamePlayed;
}

/** Prisma `where` equivalent of isActiveDay, for the streak jobs. */
export const activeDayWhere = { OR: [{ planted: true }, { gamePlayed: true }] } satisfies Prisma.StreakHistoryWhereInput;

export type StreakActivitySource = 'plant' | 'game';

/**
 * Marks today as an active day and recomputes the streak. Only the flag for `source` is set,
 * so a game never clobbers `planted` (or an existing `protectedBy`) and vice versa.
 */
export async function recordActivityToday(
  tx: Prisma.TransactionClient,
  userId: string,
  source: StreakActivitySource,
  protectedBy?: StreakProtectedBy
) {
  const today = startOfUtcDay(new Date());
  const flag = source === 'plant' ? { planted: true } : { gamePlayed: true };

  await tx.streakHistory.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: { ...flag, protectedBy },
    create: { userId, activityDate: today, ...flag, protectedBy },
  });

  // Walk backwards from today counting consecutive active days.
  let streakCurrent = 0;
  let cursor = today;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await tx.streakHistory.findUnique({
      where: { userId_activityDate: { userId, activityDate: cursor } },
    });
    if (!row || !isActiveDay(row)) break;
    streakCurrent += 1;
    cursor = addDays(cursor, -1);
  }

  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const streakMax = Math.max(user.streakMax, streakCurrent);

  // Crossing a 7-day milestone earns a freeze. Comparing against the stored value means repeat
  // calls on the same day (plant + game) can't double-award. A day bought with a freeze/XP
  // (`protectedBy`) never earns one, so spending can't refund itself.
  const earnedFreeze =
    !protectedBy &&
    Math.floor(streakCurrent / FREEZE_EARN_EVERY_DAYS) > Math.floor(user.streakCurrent / FREEZE_EARN_EVERY_DAYS) &&
    user.streakFreezesAvailable < MAX_STREAK_FREEZES;

  return tx.user.update({
    where: { id: userId },
    data: { streakCurrent, streakMax, ...(earnedFreeze ? { streakFreezesAvailable: { increment: 1 } } : {}) },
  });
}

export function recordPlantedToday(
  tx: Prisma.TransactionClient,
  userId: string,
  protectedBy?: StreakProtectedBy
) {
  return recordActivityToday(tx, userId, 'plant', protectedBy);
}

export type StreakState = 'safe' | 'at_risk' | 'broken';

export interface StreakStatus {
  /** safe: active today. at_risk: active yesterday, not yet today. broken: neither. */
  state: StreakState;
  /** The streak as it really stands now — 0 once a full day has been missed. */
  streakCurrent: number;
  /** Exactly one missed day (yesterday) sits between a live run and today, so it can be bought back. */
  revivable: boolean;
  /** Length of the run that ended the day before the missed day (0 when not revivable). */
  previousStreak: number;
  /** What the streak becomes if revived. */
  restoredStreak: number;
  /** The missed day a revive would fill (YYYY-MM-DD), else null. */
  reviveDate: string | null;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Consecutive days present in `days`, counting backwards from `end` (0 if `end` itself is absent). */
function runEndingAt(days: Set<string>, end: Date): number {
  let n = 0;
  let cursor = end;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/**
 * Derives the real streak from the StreakHistory ledger. `User.streakCurrent` is only rewritten
 * when the user is active, so it goes stale the moment a day is missed — this is the source of truth.
 */
export async function getStreakStatus(db: Prisma.TransactionClient, userId: string): Promise<StreakStatus> {
  const today = startOfUtcDay(new Date());
  const yesterday = addDays(today, -1);
  const dayBefore = addDays(today, -2);

  const rows = await db.streakHistory.findMany({
    where: { userId, activityDate: { lte: today, gte: addDays(today, -STATUS_LOOKBACK_DAYS) }, ...activeDayWhere },
    select: { activityDate: true },
  });
  const days = new Set(rows.map((r) => dayKey(r.activityDate)));

  const activeToday = days.has(dayKey(today));
  const activeYesterday = days.has(dayKey(yesterday));

  const streakCurrent = activeToday ? runEndingAt(days, today) : activeYesterday ? runEndingAt(days, yesterday) : 0;
  const state: StreakState = activeToday ? 'safe' : activeYesterday ? 'at_risk' : 'broken';

  const revivable = !activeYesterday && days.has(dayKey(dayBefore));
  const previousStreak = revivable ? runEndingAt(days, dayBefore) : 0;

  return {
    state,
    streakCurrent,
    revivable,
    previousStreak,
    restoredStreak: revivable ? previousStreak + 1 + (activeToday ? runEndingAt(days, today) : 0) : streakCurrent,
    reviveDate: revivable ? dayKey(yesterday) : null,
  };
}

/** Brings the stored counters in line with the ledger (fixes a stale `streakCurrent` after a missed day). */
export async function syncStreak(db: Prisma.TransactionClient, userId: string) {
  const status = await getStreakStatus(db, userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.streakCurrent === status.streakCurrent && user.streakMax >= status.streakCurrent) return { user, status };
  const updated = await db.user.update({
    where: { id: userId },
    data: { streakCurrent: status.streakCurrent, streakMax: Math.max(user.streakMax, status.streakCurrent) },
  });
  return { user: updated, status };
}

/**
 * Buys back a single missed day (yesterday) with a streak freeze or XP, joining the run before it
 * to whatever came after. Longer gaps can't be revived.
 */
export async function reviveStreak(tx: Prisma.TransactionClient, userId: string, method: 'freeze' | 'xp') {
  const before = await getStreakStatus(tx, userId);
  if (!before.revivable || !before.reviveDate) throw new BadRequestError('There is no missed day to revive');

  const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (method === 'freeze') {
    if (current.streakFreezesAvailable <= 0) throw new BadRequestError('No streak freezes available');
    await tx.user.update({ where: { id: userId }, data: { streakFreezesAvailable: { decrement: 1 } } });
  } else {
    if (current.xp < XP_STREAK_SAVE_COST) throw new BadRequestError('Not enough XP');
    await addXp(tx, userId, -XP_STREAK_SAVE_COST, 'streak_saved_xp_spend');
  }

  const activityDate = new Date(`${before.reviveDate}T00:00:00.000Z`);
  await tx.streakHistory.upsert({
    where: { userId_activityDate: { userId, activityDate } },
    update: { planted: true, protectedBy: method },
    create: { userId, activityDate, planted: true, protectedBy: method },
  });

  return syncStreak(tx, userId);
}
