import { Prisma, AchievementCriteriaType, Rarity } from '@plant/db';
import { addXp } from './xp.service';

const RARITY_XP: Record<Rarity, number> = { common: 25, rare: 50, epic: 100, legendary: 200 };

function getSeason(date: Date): number {
  const month = date.getUTCMonth(); // 0-11
  return Math.floor((((month + 1) % 12) / 3));
}

async function computeProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  type: AchievementCriteriaType
): Promise<number> {
  switch (type) {
    case 'trees_planted': {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return user.treesPlantedCount;
    }
    case 'streak_days': {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return user.streakCurrent;
    }
    case 'co2_absorbed': {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return Math.floor(Number(user.totalCo2Absorbed));
    }
    case 'species_diversity': {
      const distinct = await tx.tree.findMany({
        where: { userId, isDeleted: false },
        distinct: ['speciesId'],
        select: { speciesId: true },
      });
      return distinct.length;
    }
    case 'friends_count': {
      return tx.friendship.count({
        where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      });
    }
    case 'forest_level': {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return user.level;
    }
    case 'seasonal_diversity': {
      const trees = await tx.tree.findMany({
        where: { userId, isDeleted: false },
        select: { plantedAt: true },
      });
      const seasons = new Set(trees.map((t) => getSeason(t.plantedAt)));
      return seasons.size;
    }
    default:
      return 0;
  }
}

export async function evaluateAchievements(tx: Prisma.TransactionClient, userId: string) {
  const achievements = await tx.achievement.findMany();

  for (const achievement of achievements) {
    const existing = await tx.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    if (existing?.unlocked) continue;

    const progress = await computeProgress(tx, userId, achievement.criteriaType);
    const target = achievement.criteriaTarget ?? 0;
    const unlocked = target > 0 && progress >= target;

    await tx.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: { progress, unlocked, unlockedAt: unlocked ? new Date() : existing?.unlockedAt ?? null },
      create: { userId, achievementId: achievement.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null },
    });

    if (unlocked && !existing?.unlocked) {
      await tx.user.update({ where: { id: userId }, data: { badgesCount: { increment: 1 } } });
      await addXp(tx, userId, RARITY_XP[achievement.rarity], 'achievement_unlocked', 'achievement', achievement.id);
      await tx.activityFeed.create({
        data: { userId, type: 'achievement_unlocked', referenceType: 'achievement', referenceId: achievement.id },
      });
    }
  }
}
