import { PrismaClient } from '@arth/db';
import type { ActionableHealthStatus } from './plantedTree.service';
import { requireApprovedNgoProfile } from './ngo.service';
import { notify } from './notification.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { assertGpsNotMocked, assertObservationGpsAccuracy, assertCloseEnoughToObserve } from './plantingLocation.service';
import type { LatLng } from '../utils/geo';

// Who to tell about a new observation on this tree — the individual Tree's own planter, or (for
// an NGO PlantedTree) whoever has actually adopted it, if anyone. A PlantedTree with no adopter
// has no one to notify, which is expected, not an error.
async function findTreeOwnerUserId(
  prisma: PrismaClient,
  target: { treeId?: string; plantedTreeId?: string },
): Promise<string | null> {
  if (target.treeId) {
    const tree = await prisma.tree.findUnique({ where: { id: target.treeId }, select: { userId: true } });
    return tree?.userId ?? null;
  }
  const listing = await prisma.adoptableTree.findFirst({
    where: { plantedTreeId: target.plantedTreeId, adoption: { isNot: null } },
    select: { adoption: { select: { userId: true } } },
  });
  return listing?.adoption?.userId ?? null;
}

async function notifyOwnerOfObservation(
  prisma: PrismaClient,
  target: { treeId?: string; plantedTreeId?: string },
  actorUserId: string,
  status: ActionableHealthStatus,
) {
  const ownerUserId = await findTreeOwnerUserId(prisma, target);
  if (!ownerUserId) return;
  await notify(prisma, {
    userId: ownerUserId,
    type: 'tree_observation_logged',
    actorUserId,
    data: { treeId: target.treeId, plantedTreeId: target.plantedTreeId, status },
    push: { title: 'Your tree was just observed 🌳', body: 'A new observation was added to its story.' },
  });
}

async function notifyOwnerOfPendingUpdate(
  prisma: PrismaClient,
  target: { treeId?: string; plantedTreeId?: string },
  actorUserId: string,
  observationId: string,
  ownerUserId: string,
) {
  await notify(prisma, {
    userId: ownerUserId,
    type: 'tree_update_received',
    actorUserId,
    data: { observationId, treeId: target.treeId, plantedTreeId: target.plantedTreeId },
    push: { title: 'Someone sent an update on your tree 🌳', body: 'Review it and decide if it joins the tree’s story.' },
  });
}

interface SelfReportedObservationInput {
  status: ActionableHealthStatus;
  note?: string;
  photoUrl?: string;
}

// Owner self-check-in on their own individual Tree — the only path (besides an NGO's own
// observation) that moves the tree's canonical healthStatus, since it's the owner vouching for
// their own tree.
export async function logOwnerObservation(
  prisma: PrismaClient,
  userId: string,
  treeId: string,
  input: SelfReportedObservationInput,
) {
  const tree = await prisma.tree.findFirst({ where: { id: treeId, userId, isDeleted: false } });
  if (!tree) throw new NotFoundError('Tree not found');

  const observation = await prisma.$transaction(async (tx) => {
    const observation = await tx.treeObservation.create({
      data: {
        treeId: tree.id,
        observerUserId: userId,
        observerRole: 'owner',
        status: input.status,
        note: input.note,
        photoUrl: input.photoUrl,
      },
    });
    await tx.tree.update({ where: { id: tree.id }, data: { healthStatus: input.status } });
    return observation;
  });

  if (input.status === 'dead') {
    // No actorUserId here deliberately — this isn't "someone else acted on your tree" (which
    // notify() auto-skips when the actor is the recipient), it's a system-triggered,
    // gentler acknowledgment of the tree's own owner's action, so it must always send.
    await notify(prisma, {
      userId,
      type: 'tree_marked_dead',
      data: { treeId: tree.id, nickname: tree.nickname },
      push: { title: `We're sorry about ${tree.nickname}`, body: 'Its journey has ended, but you gave it a beginning — it stays in your forest.' },
    });
  }

  return observation;
}

// An NGO staffer observing one individually-identified PlantedTree outside the existing
// zone/bulk flow. Deliberately does NOT touch TreeHealthCheck or any survival-stat computation
// (plantedTree.service.ts's getLatestStatusByTree/computeSurvivalStats keep reading
// TreeHealthCheck only) — this is a Passport-timeline-only concern for NGO trees, so a number an
// NGO already reports externally never silently changes because of this new path.
export async function logNgoIndividualObservation(
  prisma: PrismaClient,
  ngoUserId: string,
  plantedTreeId: string,
  input: SelfReportedObservationInput,
) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const tree = await prisma.plantedTree.findFirst({ where: { id: plantedTreeId, ngoId: ngo.id } });
  if (!tree) throw new NotFoundError('Planted tree not found');

  const observation = await prisma.treeObservation.create({
    data: {
      plantedTreeId: tree.id,
      observerUserId: ngoUserId,
      observerRole: 'ngo',
      status: input.status,
      note: input.note,
      photoUrl: input.photoUrl,
    },
  });

  await notifyOwnerOfObservation(prisma, { plantedTreeId: tree.id }, ngoUserId, input.status);

  return observation;
}

export interface CommunityObservationTarget {
  treeId?: string;
  plantedTreeId?: string;
}

interface CommunityObservationInput {
  status: ActionableHealthStatus;
  note?: string;
  // Required, unlike the owner/NGO paths — a community observation with no fresh photo is not
  // meaningful corroborating evidence.
  photoUrl: string;
  point: LatLng;
  accuracyMeters: number;
  mocked: boolean;
}

// Any ARTH user observing a tree they're physically standing near. Informational/corroborating
// only — never moves the tree's canonical healthStatus (one bad-faith submission must never flip
// a tree to "dead"; only `owner`/`ngo` observations do that). Must pass the strict geofence
// (see plantingLocation.service.ts) before it's ever written.
export async function logCommunityObservation(
  prisma: PrismaClient,
  observerUserId: string,
  target: CommunityObservationTarget,
  input: CommunityObservationInput,
) {
  if (!target.treeId === !target.plantedTreeId) {
    throw new BadRequestError('Exactly one of treeId/plantedTreeId must be set');
  }

  const trueCoords = target.treeId
    ? await prisma.tree.findFirst({
        where: { id: target.treeId, isDeleted: false },
        select: { lat: true, lng: true },
      })
    : await prisma.plantedTree.findFirst({
        where: { id: target.plantedTreeId },
        select: { lat: true, lng: true },
      });
  if (!trueCoords || trueCoords.lat === null || trueCoords.lng === null) {
    throw new NotFoundError('Tree not found');
  }

  assertGpsNotMocked(input.mocked);
  assertObservationGpsAccuracy(input.accuracyMeters);
  const distanceM = assertCloseEnoughToObserve(
    { lat: Number(trueCoords.lat), lng: Number(trueCoords.lng) },
    input.point,
  );

  // Community updates wait for the owner's decision. A tree with nobody to decide (an NGO tree
  // with no adopter) has no reviewer, so its update is accepted straight away rather than lost.
  const ownerUserId = await findTreeOwnerUserId(prisma, target);

  const observation = await prisma.treeObservation.create({
    data: {
      treeId: target.treeId,
      plantedTreeId: target.plantedTreeId,
      observerUserId,
      observerRole: 'community',
      reviewStatus: ownerUserId ? 'pending' : 'accepted',
      status: input.status,
      note: input.note,
      photoUrl: input.photoUrl,
      gpsLat: input.point.lat,
      gpsLng: input.point.lng,
      gpsAccuracyM: input.accuracyMeters,
      distanceToTreeM: distanceM,
    },
  });

  if (ownerUserId) {
    await notifyOwnerOfPendingUpdate(prisma, target, observerUserId, observation.id, ownerUserId);
  }

  return observation;
}

// Owner's decision on a pending community update. Accepting only makes it visible on the
// passport timeline — it never moves the tree's canonical healthStatus (see
// logCommunityObservation's note above).
export async function reviewCommunityObservation(
  prisma: PrismaClient,
  ownerUserId: string,
  observationId: string,
  decision: 'accepted' | 'rejected',
) {
  const observation = await prisma.treeObservation.findUnique({ where: { id: observationId } });
  if (!observation || observation.observerRole !== 'community') throw new NotFoundError('Update not found');

  const target = observation.treeId ? { treeId: observation.treeId } : { plantedTreeId: observation.plantedTreeId ?? undefined };
  if ((await findTreeOwnerUserId(prisma, target)) !== ownerUserId) {
    throw new ForbiddenError('Only the tree’s owner can review this update');
  }
  if (observation.reviewStatus !== 'pending') throw new BadRequestError('This update was already reviewed');

  const updated = await prisma.treeObservation.update({
    where: { id: observation.id },
    data: { reviewStatus: decision, reviewedAt: new Date() },
  });

  await notify(prisma, {
    userId: observation.observerUserId,
    type: 'tree_update_decided',
    actorUserId: ownerUserId,
    data: { observationId, treeId: observation.treeId, plantedTreeId: observation.plantedTreeId, decision },
    push: {
      title: decision === 'accepted' ? 'Your tree update was accepted 🌱' : 'Your tree update was reviewed',
      body: decision === 'accepted' ? 'The owner added it to the tree’s timeline.' : 'The owner chose not to add it to the timeline.',
    },
  });

  return updated;
}
