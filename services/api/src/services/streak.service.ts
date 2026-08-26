import { Prisma, StreakProtectedBy } from '@plant/db';

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function recordPlantedToday(
  tx: Prisma.TransactionClient,
  userId: string,
  protectedBy?: StreakProtectedBy
) {
  const today = startOfUtcDay(new Date());

  await tx.streakHistory.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: { planted: true, protectedBy },
    create: { userId, activityDate: today, planted: true, protectedBy },
  });

  // Walk backwards from today counting consecutive planted days.
  let streakCurrent = 0;
  let cursor = today;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await tx.streakHistory.findUnique({
      where: { userId_activityDate: { userId, activityDate: cursor } },
    });
    if (!row || !row.planted) break;
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
