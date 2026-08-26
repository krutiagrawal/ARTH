import { Prisma, NgoAchievementCriteriaType } from '@plant/db';

async function computeNgoProgress(
  tx: Prisma.TransactionClient,
  ngoId: string,
  type: NgoAchievementCriteriaType
): Promise<number> {
  switch (type) {
    case 'drives_hosted': {
      return tx.drive.count({ where: { ngoId } });
    }
    case 'trees_planted': {
      return tx.plantedTree.count({ where: { ngoId } });
    }
    case 'funds_raised_cents': {
      const donations = await tx.donation.findMany({
        where: { status: 'succeeded', campaign: { ngoId } },
        select: { amountCents: true },
      });
      return donations.reduce((sum, d) => sum + d.amountCents, 0);
    }
    case 'volunteers_reached': {
      const distinct = await tx.driveRsvp.findMany({
        where: { status: 'confirmed', drive: { ngoId } },
        select: { userId: true },
        distinct: ['userId'],
      });
      return distinct.length;
    }
    case 'followers_count': {
      return tx.follow.count({ where: { ngoId } });
    }
    case 'streak_weeks': {
      const ngo = await tx.ngoProfile.findUniqueOrThrow({ where: { id: ngoId } });
      return ngo.streakCurrent;
    }
    default:
      return 0;
  }
}

// Mirrors achievement.service.ts's evaluateAchievements, scoped to NgoProfile instead of
// User. No XP reward and no ActivityFeed write — NGOs have no XP economy, and the activity
// feed is a user-social-graph concept that doesn't have an NGO-side equivalent yet.
export async function evaluateNgoAchievements(tx: Prisma.TransactionClient, ngoId: string) {
  const achievements = await tx.ngoAchievement.findMany();

  for (const achievement of achievements) {
    const existing = await tx.ngoAchievementUnlock.findUnique({
      where: { ngoId_achievementId: { ngoId, achievementId: achievement.id } },
    });
    if (existing?.unlocked) continue;

    const progress = await computeNgoProgress(tx, ngoId, achievement.criteriaType);
    const target = achievement.criteriaTarget ?? 0;
    const unlocked = target > 0 && progress >= target;

    await tx.ngoAchievementUnlock.upsert({
      where: { ngoId_achievementId: { ngoId, achievementId: achievement.id } },
      update: { progress, unlocked, unlockedAt: unlocked ? new Date() : existing?.unlockedAt ?? null },
      create: { ngoId, achievementId: achievement.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null },
    });

    if (unlocked && !existing?.unlocked) {
      await tx.ngoProfile.update({ where: { id: ngoId }, data: { badgesCount: { increment: 1 } } });
    }
  }
}
