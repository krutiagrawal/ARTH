import { Prisma, GroupAchievementCriteriaType } from '@plant/db';

async function computeGroupProgress(
  tx: Prisma.TransactionClient,
  groupId: string,
  type: GroupAchievementCriteriaType
): Promise<number> {
  switch (type) {
    case 'trees_planted': {
      const memberIds = (await tx.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
        (m) => m.userId
      );
      if (memberIds.length === 0) return 0;
      return tx.tree.count({ where: { userId: { in: memberIds }, isDeleted: false } });
    }
    case 'member_count': {
      return tx.groupMember.count({ where: { groupId } });
    }
    case 'streak_days': {
      const group = await tx.groupProfile.findUniqueOrThrow({ where: { id: groupId } });
      return group.streakCurrent;
    }
    case 'co2_absorbed': {
      const memberIds = (await tx.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
        (m) => m.userId
      );
      if (memberIds.length === 0) return 0;
      const members = await tx.user.findMany({
        where: { id: { in: memberIds } },
        select: { totalCo2Absorbed: true },
      });
      return members.reduce((sum, m) => sum + Number(m.totalCo2Absorbed), 0);
    }
    case 'challenges_completed': {
      const challenges = await tx.groupChallenge.findMany({
        where: { groupId, endsAt: { lte: new Date() } },
      });
      let completed = 0;
      for (const challenge of challenges) {
        if (challenge.goalType !== 'trees_planted_count') continue;
        const memberIds = (await tx.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
          (m) => m.userId
        );
        if (memberIds.length === 0) continue;
        const progress = await tx.tree.count({
          where: {
            userId: { in: memberIds },
            isDeleted: false,
            plantedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
          },
        });
        if (progress >= challenge.goalTotal) completed += 1;
      }
      return completed;
    }
    default:
      return 0;
  }
}

// Mirrors ngoAchievement.service.ts's evaluateNgoAchievements, scoped to GroupProfile —
// collective group milestones, distinct from any individual member's own achievements.
export async function evaluateGroupAchievements(tx: Prisma.TransactionClient, groupId: string) {
  const achievements = await tx.groupAchievement.findMany();

  for (const achievement of achievements) {
    const existing = await tx.groupAchievementUnlock.findUnique({
      where: { groupId_achievementId: { groupId, achievementId: achievement.id } },
    });
    if (existing?.unlocked) continue;

    const progress = await computeGroupProgress(tx, groupId, achievement.criteriaType);
    const target = achievement.criteriaTarget ?? 0;
    const unlocked = target > 0 && progress >= target;

    await tx.groupAchievementUnlock.upsert({
      where: { groupId_achievementId: { groupId, achievementId: achievement.id } },
      update: { progress, unlocked, unlockedAt: unlocked ? new Date() : existing?.unlockedAt ?? null },
      create: { groupId, achievementId: achievement.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null },
    });

    if (unlocked && !existing?.unlocked) {
      await tx.groupProfile.update({ where: { id: groupId }, data: { badgesCount: { increment: 1 } } });
    }
  }
}
