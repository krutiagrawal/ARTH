import { Prisma, PrismaClient, generatePublicId } from '@arth/db';
import { addXp } from './xp.service';
import { recordPlantedToday } from './streak.service';
import { evaluateAchievements } from './achievement.service';
import { bumpTreePlantedChallenges } from './challenge.service';
import { completeMissionByType } from './missions.service';
import { recordGroupPlantedToday } from './groupStreak.service';
import { evaluateGroupAchievements } from './groupAchievement.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { assertEligiblePlantingLocation, assertNoNearbyOwnPlanting } from './plantingLocation.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { maybeMarkOrderPlantationVerified } from './order.service';
import { notify } from './notification.service';
import { refreshUserCo2 } from './treeImpact.service';

const PUBLIC_ID_CREATE_ATTEMPTS = 5;

// Wraps a Tree-creating Prisma call with retry-on-publicId-collision — generatePublicId()'s
// collision odds are low but non-zero, and a bare create() can't retry itself once it's thrown.
async function createTreeWithPublicId<T>(
  create: (publicId: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= PUBLIC_ID_CREATE_ATTEMPTS; attempt++) {
    try {
      return await create(generatePublicId());
    } catch (err) {
      const isPublicIdCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('public_id');
      if (!isPublicIdCollision || attempt === PUBLIC_ID_CREATE_ATTEMPTS) throw err;
    }
  }
  throw new Error('unreachable');
}

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
  // Present only when planting a sapling scanned from a nursery order/reservation (marketplace
  // purchase or free claim) — never set for an ordinary "Plant by Yourself" tree, which is most
  // of them. See the unit-resolution block below for the validation this must pass.
  saplingUnitId?: string;
}

interface ProvenanceFollowUp {
  nurseryUserId: string;
  species: string;
  locationLabel: string | null;
  orderId: string | null;
}

export async function plantTree(prisma: PrismaClient, input: PlantTreeInput) {
  // Mirrors the ARTH_APPROVED_LOCATION_CHECK_ENABLED flag in PlantTreeScreen.tsx, which controls
  // the frontend's pre-check/warning; this is the actual enforcement.
  await assertEligiblePlantingLocation(prisma, { lat: input.lat, lng: input.lng });
  await assertNoNearbyOwnPlanting(prisma, input.userId, { lat: input.lat, lng: input.lng });

  const { tree, provenanceFollowUp } = await prisma.$transaction(async (tx) => {
    const species = await tx.treeSpecies.findUnique({ where: { id: input.speciesId } });
    if (!species) throw new NotFoundError('Unknown tree species');

    // Resolves + validates the scanned sapling before the Tree even exists, so a bad
    // saplingUnitId never leaves an orphaned Tree behind. A bulk-requirement-sourced unit
    // (NGO supply chain) is explicitly rejected here — that path is consumed exclusively by
    // plantedTree.service.ts's bulkCreatePlantedTrees, never by an individual Tree, same spirit
    // as "no NGO on an independently-planted tree."
    const findUnit = (id: string) =>
      tx.arthSaplingUnit.findUnique({
        where: { id },
        include: {
          orderItem: { select: { orderId: true, order: { select: { userId: true } } } },
          reservation: { select: { userId: true } },
          nursery: { select: { userId: true } },
        },
      });
    let unit: Awaited<ReturnType<typeof findUnit>> | null = null;
    if (input.saplingUnitId) {
      unit = await findUnit(input.saplingUnitId);
      if (!unit) throw new NotFoundError('Sapling unit not found');
      if (unit.bulkRequirementResponseId) {
        throw new BadRequestError('This sapling was supplied via an NGO bulk requirement and cannot be planted as an individual tree.');
      }
      if (unit.status !== 'collected') {
        throw new ForbiddenError('This sapling has not been collected yet.');
      }
      const unitOwnerUserId = unit.orderItem?.order.userId ?? unit.reservation?.userId;
      if (unitOwnerUserId !== input.userId) {
        throw new ForbiddenError('This sapling does not belong to you.');
      }
    }

    // Carbon impact is derived from species + age on read (lib/treeImpact.ts); a newly planted
    // sapling has stored essentially nothing, so nothing is credited up front. The column stays 0.
    const co2Absorbed = 0;
    const xpEarned = BASE_XP_PER_TREE;

    const tree = await createTreeWithPublicId((publicId) =>
      tx.tree.create({
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
          nurseryId: unit?.nurseryId,
          publicId,
        },
        include: { species: true },
      }),
    );

    // Tracks physical reality (a scanned sapling really was planted) independent of the AI
    // verification outcome below — a rejected/unverified photo doesn't un-plant the sapling.
    if (unit) {
      await tx.arthSaplingUnit.update({ where: { id: unit.id }, data: { status: 'planted', treeId: tree.id } });
    }

    // A photo the AI rejected, or a submission with no photo at all (status stays 'unverified'
    // — see trees.routes.ts), is persisted so an admin can review it (see admin.service.ts's
    // reviewTree) but none of the rewards below fire until that review approves it, so a bad or
    // unverifiable submission can't earn XP in the meantime. reviewTree() awards this same set
    // (XP + counters) on approval — advertising "live camera only" tree photos means a tree with
    // no photo must not get full credit either.
    // Every planting that isn't an outright photo rejection becomes a post on the planter's profile
    // (see the block below), and counts as "planted today" for the Morning Planting quest — only
    // the XP payout waits for admin approval.
    // A planting is also a post — it's how "Planted a tree" shows up on the planter's own
    // profile feed (with its photo, nickname tag, and caption) instead of only living in the
    // trees list. Skipped only in the impossible case of neither a photo nor a caption, since an
    // empty post has nothing to show.
    if (input.aiVerificationStatus !== 'rejected' && (input.photoUrl || input.caption?.trim())) {
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

    if (input.aiVerificationStatus === 'rejected' || input.aiVerificationStatus === 'unverified') {
      if (input.aiVerificationStatus === 'unverified') {
        await completeMissionByType(tx, input.userId, 'plant', false);
      }
      return { tree, provenanceFollowUp: null as ProvenanceFollowUp | null };
    }

    await tx.user.update({
      where: { id: input.userId },
      data: {
        treesPlantedCount: { increment: 1 },
      },
    });
    await refreshUserCo2(tx, input.userId);

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

    // Immediate-verification provenance follow-up — the counterpart to admin.service.ts's
    // reviewTree, which already does this same thing for a tree that was unverified/rejected at
    // submit time and only later admin-approved. A tree verified right away at submission had no
    // equivalent call site until now.
    let provenanceFollowUp: ProvenanceFollowUp | null = null;
    if (unit) {
      await evaluateNurseryAchievements(tx, unit.nurseryId);
      let orderCompleted = false;
      if (unit.orderItem) {
        orderCompleted = await maybeMarkOrderPlantationVerified(tx, unit.orderItem.orderId);
      }
      provenanceFollowUp = {
        nurseryUserId: unit.nursery!.userId,
        species: species.commonName,
        locationLabel: input.locationLabel ?? null,
        orderId: orderCompleted && unit.orderItem ? unit.orderItem.orderId : null,
      };
    }

    return { tree, provenanceFollowUp };
  });

  if (provenanceFollowUp) {
    await notify(prisma, {
      userId: provenanceFollowUp.nurseryUserId,
      type: 'sapling_planted',
      data: { treeId: tree.id, species: provenanceFollowUp.species, locationLabel: provenanceFollowUp.locationLabel },
      push: { title: '🌱 One of your saplings just became an ARTH Tree', body: `A ${provenanceFollowUp.species} you supplied was just verified.` },
    });
    if (provenanceFollowUp.orderId) {
      await notify(prisma, {
        userId: provenanceFollowUp.nurseryUserId,
        type: 'order_plantation_verified',
        data: { orderId: provenanceFollowUp.orderId },
        push: { title: '🌳 Plantation verified', body: 'Every sapling in this order is now a verified ARTH Tree.' },
      });
    }
  }

  return tree;
}
