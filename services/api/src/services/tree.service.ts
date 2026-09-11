import { PrismaClient } from '@plant/db';
import { addXp } from './xp.service';
import { recordPlantedToday } from './streak.service';
import { evaluateAchievements } from './achievement.service';
import { bumpTreePlantedChallenges } from './challenge.service';
import { completeMissionByType } from './missions.service';
import { recordGroupPlantedToday } from './groupStreak.service';
import { evaluateGroupAchievements } from './groupAchievement.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { maybeMarkOrderPlantationVerified } from './order.service';
import { notify } from './notification.service';
import { ForbiddenError, NotFoundError } from '../utils/errors';
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
  // Set when this planting came from scanning an ARTH Sapling QR (marketplace order, free
  // reservation, or NGO bulk-requirement supply) — see ArthSaplingUnit. Locks the tree's species
  // to what the nursery actually supplied and threads nursery provenance through to the Tree.
  sourceUnitId?: string;
}

export async function plantTree(prisma: PrismaClient, input: PlantTreeInput) {
  // TEMP: "ARTH approved planting spot" gating disabled for indoor testing — uncomment to
  // restore. Mirrors the ARTH_APPROVED_LOCATION_CHECK_ENABLED flag in PlantTreeScreen.tsx, which
  // only controls the frontend's pre-check/warning; this is the actual enforcement.
  // await assertEligiblePlantingLocation(prisma, { lat: input.lat, lng: input.lng });
  await assertNoNearbyOwnPlanting(prisma, input.userId, { lat: input.lat, lng: input.lng });

  let sourceUnit: {
    id: string;
    nurseryId: string;
    speciesId: string | null;
    orderItemId: string | null;
    reservationId: string | null;
    bulkRequirementResponseId: string | null;
  } | null = null;

  if (input.sourceUnitId) {
    const unit = await prisma.arthSaplingUnit.findUnique({
      where: { id: input.sourceUnitId },
      include: {
        orderItem: { select: { order: { select: { userId: true } } } },
        reservation: { select: { userId: true } },
      },
    });
    if (!unit) throw new NotFoundError('Sapling not found');
    if (unit.status !== 'collected') throw new ForbiddenError('This sapling has not been collected yet');
    if (unit.treeId) throw new ForbiddenError('This sapling has already been planted');

    const ownerId = unit.orderItem?.order.userId ?? unit.reservation?.userId ?? null;
    if (ownerId !== input.userId) throw new ForbiddenError('This sapling was not issued to you');

    sourceUnit = {
      id: unit.id,
      nurseryId: unit.nurseryId,
      speciesId: unit.speciesId,
      orderItemId: unit.orderItemId,
      reservationId: unit.reservationId,
      bulkRequirementResponseId: unit.bulkRequirementResponseId,
    };
  }

  // Locks the species to what the nursery actually supplied when scanning a real sapling — don't
  // trust a client-supplied speciesId over the unit's own record.
  const effectiveSpeciesId = sourceUnit?.speciesId ?? input.speciesId;

  const { tree, orderId } = await prisma.$transaction(async (tx) => {
    const species = await tx.treeSpecies.findUnique({ where: { id: effectiveSpeciesId } });
    if (!species) throw new NotFoundError('Unknown tree species');

    const co2Absorbed = species.co2KgPerYear ? Number(species.co2KgPerYear) / 12 : 1;
    const xpEarned = BASE_XP_PER_TREE;

    const tree = await tx.tree.create({
      data: {
        userId: input.userId,
        speciesId: effectiveSpeciesId,
        nickname: input.nickname,
        lat: input.lat,
        lng: input.lng,
        locationLabel: input.locationLabel,
        photoUrl: input.photoUrl,
        co2Absorbed,
        xpEarned,
        aiVerificationStatus: input.aiVerificationStatus,
        nurseryId: sourceUnit?.nurseryId,
      },
      include: { species: true },
    });

    let orderId: string | null = null;
    if (sourceUnit) {
      let unitOrderId: string | null = null;
      if (sourceUnit.orderItemId) {
        const orderItem = await tx.orderItem.findUnique({ where: { id: sourceUnit.orderItemId }, select: { orderId: true } });
        unitOrderId = orderItem?.orderId ?? null;
      }
      orderId = unitOrderId;
      await tx.arthSaplingUnit.update({ where: { id: sourceUnit.id }, data: { status: 'planted', treeId: tree.id } });
    }

    // A photo the AI rejected is persisted (so an admin can review it — see
    // admin.service.ts's reviewTree) but none of the rewards below fire until
    // that review approves it, so a bad submission can't earn XP in the
    // meantime. reviewTree() awards this same set (XP + counters) on approval.
    if (input.aiVerificationStatus === 'rejected') {
      return { tree, orderId: null };
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

    if (sourceUnit) {
      await evaluateNurseryAchievements(tx, sourceUnit.nurseryId);
    }

    return { tree, orderId };
  });

  // Post-commit nursery-facing follow-up (sections 5/7/11) — never inside the transaction above,
  // matching notify()'s "never roll back the triggering action" contract.
  if (sourceUnit && input.aiVerificationStatus !== 'rejected') {
    const nursery = await prisma.nurseryProfile.findUnique({ where: { id: sourceUnit.nurseryId }, select: { userId: true } });
    if (nursery) {
      await notify(prisma, {
        userId: nursery.userId,
        type: 'sapling_planted',
        data: { treeId: tree.id, species: tree.species.commonName, locationLabel: input.locationLabel },
        push: { title: '🌱 One of your saplings just became an ARTH Tree', body: `A ${tree.species.commonName} you supplied was just planted${input.locationLabel ? ` in ${input.locationLabel}` : ''}.` },
      });
    }

    if (orderId && input.aiVerificationStatus === 'verified') {
      const justCompleted = await prisma.$transaction((tx) => maybeMarkOrderPlantationVerified(tx, orderId));
      if (justCompleted && nursery) {
        await notify(prisma, {
          userId: nursery.userId,
          type: 'order_plantation_verified',
          data: { orderId },
          push: { title: '🌳 Plantation verified', body: 'Every sapling in this order is now a verified ARTH Tree.' },
        });
      }
    }
  }

  return tree;
}
