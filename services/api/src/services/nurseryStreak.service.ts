import { Prisma } from '@plant/db';
import { startOfUtcDay, addDays } from './streak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';

// Daily analog of streak.service.ts's recordPlantedToday, scoped to NurseryProfile — a
// nursery's streak reflects "was there stock/reservation activity today".
export async function recordNurseryActiveToday(tx: Prisma.TransactionClient, nurseryId: string) {
  const today = startOfUtcDay(new Date());

  await tx.nurseryStreakHistory.upsert({
    where: { nurseryId_activityDate: { nurseryId, activityDate: today } },
    update: { planted: true },
    create: { nurseryId, activityDate: today, planted: true },
  });

  let streakCurrent = 0;
  let cursor = today;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await tx.nurseryStreakHistory.findUnique({
      where: { nurseryId_activityDate: { nurseryId, activityDate: cursor } },
    });
    if (!row || !row.planted) break;
    streakCurrent += 1;
    cursor = addDays(cursor, -1);
  }

  const nursery = await tx.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
  const streakMax = Math.max(nursery.streakMax, streakCurrent);

  const updated = await tx.nurseryProfile.update({
    where: { id: nurseryId },
    data: { streakCurrent, streakMax },
  });

  await evaluateNurseryAchievements(tx, nurseryId);

  return updated;
}
