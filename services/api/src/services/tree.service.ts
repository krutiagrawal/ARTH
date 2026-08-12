import { PrismaClient } from '@prisma/client';
import { addXp } from './xp.service';
import { recordPlantedToday } from './streak.service';
import { evaluateAchievements } from './achievement.service';
import { bumpTreePlantedChallenges } from './challenge.service';
import { completeMissionByType } from './missions.service';
import { NotFoundError } from '../utils/errors';

const BASE_XP_PER_TREE = 80;

interface PlantTreeInput {
  userId: string;
  speciesId: string;
  nickname: string;
  lat: number;
  lng: number;
  locationLabel?: string;
  photoUrl?: string;
}

export async function plantTree(prisma: PrismaClient, input: PlantTreeInput) {
  return prisma.$transaction(async (tx) => {
    const species = await tx.treeSpecies.findUnique({ where: { id: input.speciesId } });
    if (!species) throw new NotFoundError('Unknown tree species');

    const co2Absorbed = species.co2KgPerYear ? Number(species.co2KgPerYear) / 12 : 1;
    const xpEarned = BASE_XP_PER_TREE;

    const tree = await tx.tree.create({
      data: {
        userId: input.userId,
        speciesId: input.speciesId,
        nickname: input.nickname,
        lat: input.lat,
        lng: input.lng,
        locationLabel: input.locationLabel,
        photoUrl: input.photoUrl,
        co2Absorbed,
        xpEarned,
      },
      include: { species: true },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: {
        treesPlantedCount: { increment: 1 },
        totalCo2Absorbed: { increment: co2Absorbed },
      },
    });

    await addXp(tx, input.userId, xpEarned, 'tree_planted', 'tree', tree.id);
    await recordPlantedToday(tx, input.userId);
    await completeMissionByType(tx, input.userId, 'plant');
    await evaluateAchievements(tx, input.userId);
    await bumpTreePlantedChallenges(tx, input.userId);

    await tx.activityFeed.create({
      data: { userId: input.userId, type: 'tree_planted', referenceType: 'tree', referenceId: tree.id },
    });

    return tree;
  });
}
