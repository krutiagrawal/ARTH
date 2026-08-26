import { Prisma, NurseryAchievementCriteriaType } from '@plant/db';

async function computeNurseryProgress(
  tx: Prisma.TransactionClient,
  nurseryId: string,
  type: NurseryAchievementCriteriaType
): Promise<number> {
  switch (type) {
    case 'species_listed': {
      return tx.saplingStock.count({ where: { nurseryId } });
    }
    case 'saplings_given_out': {
      const result = await tx.saplingStockLedger.aggregate({
        where: { nurseryId, reason: 'reservation_fulfilled' },
        _sum: { delta: true },
      });
      return Math.abs(result._sum.delta ?? 0);
    }
    case 'reservations_fulfilled': {
      return tx.saplingReservation.count({ where: { nurseryId, status: 'fulfilled' } });
    }
    case 'streak_days': {
      const nursery = await tx.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
      return nursery.streakCurrent;
    }
    default:
      return 0;
  }
}

// Mirrors groupAchievement.service.ts's evaluateGroupAchievements, scoped to NurseryProfile.
export async function evaluateNurseryAchievements(tx: Prisma.TransactionClient, nurseryId: string) {
  const achievements = await tx.nurseryAchievement.findMany();

  for (const achievement of achievements) {
    const existing = await tx.nurseryAchievementUnlock.findUnique({
      where: { nurseryId_achievementId: { nurseryId, achievementId: achievement.id } },
    });
    if (existing?.unlocked) continue;

    const progress = await computeNurseryProgress(tx, nurseryId, achievement.criteriaType);
    const target = achievement.criteriaTarget ?? 0;
    const unlocked = target > 0 && progress >= target;

    await tx.nurseryAchievementUnlock.upsert({
      where: { nurseryId_achievementId: { nurseryId, achievementId: achievement.id } },
      update: { progress, unlocked, unlockedAt: unlocked ? new Date() : existing?.unlockedAt ?? null },
      create: { nurseryId, achievementId: achievement.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null },
    });

    if (unlocked && !existing?.unlocked) {
      await tx.nurseryProfile.update({ where: { id: nurseryId }, data: { badgesCount: { increment: 1 } } });
    }
  }
}
