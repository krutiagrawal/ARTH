import { Prisma } from '@plant/db';
import { startOfUtcDay, addDays } from './streak.service';

// Daily analog of streak.service.ts's recordPlantedToday, scoped to GroupProfile instead
// of User — a group's streak reflects "did any member plant a tree today".
export async function recordGroupPlantedToday(tx: Prisma.TransactionClient, groupId: string) {
  const today = startOfUtcDay(new Date());

  await tx.groupStreakHistory.upsert({
    where: { groupId_activityDate: { groupId, activityDate: today } },
    update: { planted: true },
    create: { groupId, activityDate: today, planted: true },
  });

  let streakCurrent = 0;
  let cursor = today;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await tx.groupStreakHistory.findUnique({
      where: { groupId_activityDate: { groupId, activityDate: cursor } },
    });
    if (!row || !row.planted) break;
    streakCurrent += 1;
    cursor = addDays(cursor, -1);
  }

  const group = await tx.groupProfile.findUniqueOrThrow({ where: { id: groupId } });
  const streakMax = Math.max(group.streakMax, streakCurrent);

  return tx.groupProfile.update({
    where: { id: groupId },
    data: { streakCurrent, streakMax },
  });
}
