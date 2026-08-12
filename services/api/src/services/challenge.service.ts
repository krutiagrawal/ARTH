import { Prisma } from '@prisma/client';
import { addXp } from './xp.service';

export async function bumpTreePlantedChallenges(tx: Prisma.TransactionClient, userId: string) {
  const participations = await tx.challengeParticipant.findMany({
    where: {
      userId,
      completedAt: null,
      challenge: { goalType: 'trees_planted_count', isActive: true, endsAt: { gt: new Date() } },
    },
    include: { challenge: true },
  });

  for (const participation of participations) {
    const progress = participation.progress + 1;
    const completed = progress >= participation.challenge.goalTotal;

    await tx.challengeParticipant.update({
      where: { id: participation.id },
      data: { progress, completedAt: completed ? new Date() : null },
    });

    if (completed) {
      await addXp(tx, userId, participation.challenge.xpReward, 'challenge_completed', 'challenge', participation.challenge.id);
      await tx.activityFeed.create({
        data: { userId, type: 'challenge_completed', referenceType: 'challenge', referenceId: participation.challenge.id },
      });
    }
  }
}
