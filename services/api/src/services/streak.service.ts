import { Prisma, StreakProtectedBy } from '@arth/db';

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
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

  return tx.user.update({
    where: { id: userId },
    data: { streakCurrent, streakMax },
  });
}

export function recordPlantedToday(
  tx: Prisma.TransactionClient,
  userId: string,
  protectedBy?: StreakProtectedBy
) {
  return recordActivityToday(tx, userId, 'plant', protectedBy);
}
