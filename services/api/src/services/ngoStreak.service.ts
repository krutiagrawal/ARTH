import { Prisma } from '@plant/db';

// Monday-anchored week key. getUTCDay() is 0=Sun..6=Sat; this maps to days-since-Monday
// (Sunday counts as 6 days after that week's Monday, not the start of a new week).
function startOfIsoWeekUtc(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

export async function recordUpdatePostedThisWeek(tx: Prisma.TransactionClient, ngoId: string) {
  const thisWeek = startOfIsoWeekUtc(new Date());

  await tx.ngoStreakHistory.upsert({
    where: { ngoId_weekStart: { ngoId, weekStart: thisWeek } },
    update: { posted: true },
    create: { ngoId, weekStart: thisWeek, posted: true },
  });

  // Walk backwards from this week counting consecutive posted weeks.
  let streakCurrent = 0;
  let cursor = thisWeek;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await tx.ngoStreakHistory.findUnique({
      where: { ngoId_weekStart: { ngoId, weekStart: cursor } },
    });
    if (!row || !row.posted) break;
    streakCurrent += 1;
    cursor = addWeeks(cursor, -1);
  }

  const ngo = await tx.ngoProfile.findUniqueOrThrow({ where: { id: ngoId } });
  const streakMax = Math.max(ngo.streakMax, streakCurrent);

  return tx.ngoProfile.update({
    where: { id: ngoId },
    data: { streakCurrent, streakMax },
  });
}

export { startOfIsoWeekUtc, addWeeks };
