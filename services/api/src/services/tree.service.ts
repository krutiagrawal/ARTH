import { PrismaClient } from '@plant/db';
import { addXp } from './xp.service';
import { recordPlantedToday } from './streak.service';
import { evaluateAchievements } from './achievement.service';
import { bumpTreePlantedChallenges } from './challenge.service';
import { completeMissionByType } from './missions.service';
import { recordGroupPlantedToday } from './groupStreak.service';
import { evaluateGroupAchievements } from './groupAchievement.service';
import { NotFoundError } from '../utils/errors';
import { assertEligiblePlantingLocation, assertNoNearbyOwnPlanting } from './plantingLocation.service';

const BASE_XP_PER_TREE = 80;

interface PlantTreeInput {
  userId: string;
  speciesId: string;
  nickname: string;
  lat: number;
  lng: number;
  locationLabel?: string;
  caption?: string;
  photoUrl?: string;
  aiVerificationStatus?: 'unverified' | 'verified' | 'rejected';
}

export async function plantTree(prisma: PrismaClient, input: PlantTreeInput) {
  // Mirrors the ARTH_APPROVED_LOCATION_CHECK_ENABLED flag in PlantTreeScreen.tsx, which controls
  // the frontend's pre-check/warning; this is the actual enforcement.
  await assertEligiblePlantingLocation(prisma, { lat: input.lat, lng: input.lng });
  await assertNoNearbyOwnPlanting(prisma, input.userId, { lat: input.lat, lng: input.lng });

  const tree = await prisma.$transaction(async (tx) => {
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
        aiVerificationStatus: input.aiVerificationStatus,
      },
      include: { species: true },
    });

    // A photo the AI rejected, or a submission with no photo at all (status stays 'unverified'
    // — see trees.routes.ts), is persisted so an admin can review it (see admin.service.ts's
    // reviewTree) but none of the rewards below fire until that review approves it, so a bad or
    // unverifiable submission can't earn XP in the meantime. reviewTree() awards this same set
    // (XP + counters) on approval — advertising "live camera only" tree photos means a tree with
    // no photo must not get full credit either.
    if (input.aiVerificationStatus === 'rejected' || input.aiVerificationStatus === 'unverified') {
      return tree;
    }

    // A planting is also a post — it's how "Planted a tree" shows up on the planter's own
    // profile feed (with its photo, nickname tag, and caption) instead of only living in the
    // trees list. Skipped only in the impossible case of neither a photo nor a caption, since an
    // empty post has nothing to show.
    if (input.photoUrl || input.caption?.trim()) {
      await tx.post.create({
        data: {
          authorType: 'user',
          userId: input.userId,
          caption: input.caption,
          treeId: tree.id,
          media: input.photoUrl ? { create: [{ url: input.photoUrl, order: 0 }] } : undefined,
        },
      });
    }

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

    // Roll this planting up into every group the planter belongs to — a user can be in
    // multiple groups, so there's no single canonical groupId to store on the tree itself.
    const memberships = await tx.groupMember.findMany({ where: { userId: input.userId }, select: { groupId: true } });
    for (const membership of memberships) {
      await recordGroupPlantedToday(tx, membership.groupId);
      await evaluateGroupAchievements(tx, membership.groupId);
    }

    await tx.activityFeed.create({
      data: { userId: input.userId, type: 'tree_planted', referenceType: 'tree', referenceId: tree.id },
    });

    return tree;
  });

  return tree;
}
