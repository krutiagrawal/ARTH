import { PrismaClient } from '@plant/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notification.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { haversineDistanceKm } from '../utils/geo';

const NEARBY_FANOUT_RADIUS_KM = 25;

interface CreateRequirementInput {
  driveId?: string;
  speciesId?: string;
  speciesNote?: string;
  nativePreferred?: boolean;
  quantityNeeded: number;
  neededByDate?: string;
  city?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

async function getOwnNgoProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  return profile;
}

async function getOwnNurseryProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.nurseryProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Nursery profile not found');
  return profile;
}

// ---------- NGO side ----------

export async function createRequirement(prisma: PrismaClient, ngoUserId: string, input: CreateRequirementInput) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  const requirement = await prisma.bulkRequirement.create({
    data: {
      ngoId: ngo.id,
      driveId: input.driveId,
      speciesId: input.speciesId,
      speciesNote: input.speciesNote,
      nativePreferred: input.nativePreferred ?? false,
      quantityNeeded: input.quantityNeeded,
      neededByDate: input.neededByDate ? new Date(input.neededByDate) : undefined,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      notes: input.notes,
    },
    include: { species: { select: { commonName: true } } },
  });

  await fanOutToNearbyNurseries(prisma, requirement, ngo.orgName);
  return requirement;
}

async function fanOutToNearbyNurseries(
  prisma: PrismaClient,
  requirement: { id: string; city: string | null; lat: any; lng: any; quantityNeeded: number; species: { commonName: string } | null; speciesNote: string | null },
  ngoName: string,
) {
  try {
    const candidates = await prisma.nurseryProfile.findMany({
      where: { status: 'approved' },
      select: { id: true, userId: true, lat: true, lng: true, city: true },
    });

    const hasCoords = requirement.lat != null && requirement.lng != null;
    const relevant = candidates.filter((n) => {
      if (hasCoords && n.lat != null && n.lng != null) {
        return haversineDistanceKm({ lat: Number(requirement.lat), lng: Number(requirement.lng) }, { lat: Number(n.lat), lng: Number(n.lng) }) <= NEARBY_FANOUT_RADIUS_KM;
      }
      return requirement.city && n.city === requirement.city;
    });
    if (relevant.length === 0) return;

    const speciesLabel = requirement.species?.commonName ?? requirement.speciesNote ?? 'saplings';
    await prisma.notification.createMany({
      data: relevant.map((n) => ({
        userId: n.userId,
        type: 'bulk_requirement_nearby' as const,
        data: { requirementId: requirement.id, quantityNeeded: requirement.quantityNeeded, species: speciesLabel },
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('[bulkRequirement] nearby fan-out failed:', error);
  }
}

export async function listMyRequirements(prisma: PrismaClient, ngoUserId: string, status?: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  return prisma.bulkRequirement.findMany({
    where: { ngoId: ngo.id, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      species: { select: { commonName: true } },
      responses: { include: { nursery: { select: { id: true, nurseryName: true, logoUrl: true } } } },
    },
  });
}

export async function getMyRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({
    where: { id: requirementId, ngoId: ngo.id },
    include: {
      species: { select: { commonName: true } },
      responses: { include: { nursery: { select: { id: true, nurseryName: true, logoUrl: true, avgRating: true } } } },
    },
  });
  if (!requirement) throw new NotFoundError('Requirement not found');
  return requirement;
}

export async function cancelRequirement(prisma: PrismaClient, ngoUserId: string, requirementId: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const requirement = await prisma.bulkRequirement.findFirst({ where: { id: requirementId, ngoId: ngo.id } });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (!['open', 'partially_fulfilled'].includes(requirement.status)) {
    throw new BadRequestError('This requirement can no longer be cancelled');
  }
  return prisma.bulkRequirement.update({ where: { id: requirementId }, data: { status: 'cancelled' } });
}

export async function acceptResponse(prisma: PrismaClient, ngoUserId: string, responseId: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({
    where: { id: responseId, requirement: { ngoId: ngo.id } },
    include: { requirement: true, nursery: { select: { userId: true, nurseryName: true } } },
  });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'proposed') throw new BadRequestError('This response has already been responded to');

  const updated = await prisma.bulkRequirementResponse.update({
    where: { id: responseId },
    data: { status: 'accepted', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: response.nursery.userId,
    type: 'bulk_requirement_response_accepted',
    data: { requirementId: response.requirementId, quantityOffered: response.quantityOffered },
    push: { title: 'Offer accepted!', body: `Your offer to supply ${response.quantityOffered} saplings was accepted.` },
  });

  return updated;
}

export async function declineResponse(prisma: PrismaClient, ngoUserId: string, responseId: string) {
  const ngo = await getOwnNgoProfile(prisma, ngoUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({ where: { id: responseId, requirement: { ngoId: ngo.id } } });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'proposed') throw new BadRequestError('This response has already been responded to');

  return prisma.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'declined', respondedAt: new Date() } });
}

// ---------- Nursery side ----------

export async function listRelevantForNursery(
  prisma: PrismaClient,
  nurseryUserId: string,
  filter: { status?: string } = {},
) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);

  const requirements = await prisma.bulkRequirement.findMany({
    where: { status: filter.status ? (filter.status as any) : { in: ['open', 'partially_fulfilled'] } },
    orderBy: { createdAt: 'desc' },
    include: { species: { select: { commonName: true } }, ngo: { select: { orgName: true, logoUrl: true } }, responses: { where: { nurseryId: nursery.id } } },
  });

  return requirements.map((r) => ({
    ...r,
    distanceKm:
      nursery.lat != null && nursery.lng != null && r.lat != null && r.lng != null
        ? haversineDistanceKm({ lat: Number(nursery.lat), lng: Number(nursery.lng) }, { lat: Number(r.lat), lng: Number(r.lng) })
        : null,
    myResponse: r.responses[0] ?? null,
  }));
}

interface RespondInput {
  quantityOffered: number;
  priceCents?: number;
  canDeliver?: boolean;
  canPickup?: boolean;
  message?: string;
}

export async function respondToRequirement(prisma: PrismaClient, nurseryUserId: string, requirementId: string, input: RespondInput) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const requirement = await prisma.bulkRequirement.findUnique({ where: { id: requirementId }, include: { ngo: { select: { userId: true } } } });
  if (!requirement) throw new NotFoundError('Requirement not found');
  if (!['open', 'partially_fulfilled'].includes(requirement.status)) throw new BadRequestError('This requirement is no longer open');

  const response = await prisma.bulkRequirementResponse.upsert({
    where: { requirementId_nurseryId: { requirementId, nurseryId: nursery.id } },
    // A nursery revises its offer by responding again — only while still just proposed.
    update: { quantityOffered: input.quantityOffered, priceCents: input.priceCents, canDeliver: input.canDeliver ?? false, canPickup: input.canPickup ?? true, message: input.message, status: 'proposed', respondedAt: null },
    create: {
      requirementId,
      nurseryId: nursery.id,
      quantityOffered: input.quantityOffered,
      priceCents: input.priceCents,
      canDeliver: input.canDeliver ?? false,
      canPickup: input.canPickup ?? true,
      message: input.message,
    },
  });

  await notify(prisma, {
    userId: requirement.ngo.userId,
    type: 'bulk_requirement_response_received',
    data: { requirementId, nurseryName: nursery.nurseryName, quantityOffered: input.quantityOffered },
    push: { title: nursery.nurseryName, body: `Offered ${input.quantityOffered} saplings for your requirement.` },
  });

  return response;
}

export async function withdrawResponse(prisma: PrismaClient, nurseryUserId: string, responseId: string) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({ where: { id: responseId, nurseryId: nursery.id } });
  if (!response) throw new NotFoundError('Response not found');
  if (!['proposed', 'accepted'].includes(response.status)) throw new BadRequestError('This offer can no longer be withdrawn');

  return prisma.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'withdrawn' } });
}

// Nursery confirms the physical handoff actually happened — the point at which a bulk-requirement
// supply becomes real: quantityFulfilled rolls up, the requirement's status recomputes, the
// nursery's achievements are re-evaluated, and (decision 8) real ArthSaplingUnit rows are issued
// so each sapling gets the same QR/Tree-passport treatment as a marketplace purchase. Whichever
// logged-in volunteer later scans+plants one becomes that Tree's owner — no new ownership concept
// needed, since Tree ownership is already always "whoever verified the plant."
export async function markResponseFulfilled(prisma: PrismaClient, nurseryUserId: string, responseId: string) {
  const nursery = await getOwnNurseryProfile(prisma, nurseryUserId);
  const response = await prisma.bulkRequirementResponse.findFirst({
    where: { id: responseId, nurseryId: nursery.id },
    include: { requirement: { include: { species: true } } },
  });
  if (!response) throw new NotFoundError('Response not found');
  if (response.status !== 'accepted') throw new BadRequestError('Only an accepted offer can be marked fulfilled');

  await prisma.$transaction(async (tx) => {
    await tx.bulkRequirementResponse.update({ where: { id: responseId }, data: { status: 'fulfilled', respondedAt: new Date() } });

    const newFulfilled = response.requirement.quantityFulfilled + response.quantityOffered;
    await tx.bulkRequirement.update({
      where: { id: response.requirementId },
      data: {
        quantityFulfilled: newFulfilled,
        status: newFulfilled >= response.requirement.quantityNeeded ? 'fulfilled' : 'partially_fulfilled',
      },
    });

    const speciesNameSnapshot = response.requirement.species?.commonName ?? response.requirement.speciesNote ?? 'Sapling';
    const units = Array.from({ length: response.quantityOffered }, () => ({
      bulkRequirementResponseId: response.id,
      nurseryId: nursery.id,
      speciesId: response.requirement.speciesId,
      speciesNameSnapshot,
    }));
    if (units.length > 0) await tx.arthSaplingUnit.createMany({ data: units });

    await evaluateNurseryAchievements(tx, nursery.id);
  });

  return prisma.bulkRequirementResponse.findUniqueOrThrow({ where: { id: responseId } });
}
