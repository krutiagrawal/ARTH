import { DriveStatus, DriveTransportMode, PrismaClient } from '@plant/db';
import { getStripeClient } from '../lib/stripe';
import { ConflictError, NotFoundError } from '../utils/errors';
import { geocodeAddress } from '../utils/geocode';
import { haversineDistanceKm } from '../utils/geo';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { notify } from './notification.service';

interface PickupPointInput {
  address: string;
  arrivalBy: Date;
  order?: number;
}

interface DrivePlantInput {
  speciesName: string;
  priceCents: number;
}

interface CreateDriveInput {
  title: string;
  description: string;
  instructions?: string;
  address: string;
  city: string;
  transportMode?: DriveTransportMode;
  pickupPoints?: PickupPointInput[];
  plants?: DrivePlantInput[];
  startsAt: Date;
  durationMinutes?: number;
  capacity?: number;
  photoUrl?: string;
}

interface UpdateDriveInput {
  title?: string;
  description?: string;
  instructions?: string;
  address?: string;
  city?: string;
  transportMode?: DriveTransportMode;
  pickupPoints?: PickupPointInput[];
  plants?: DrivePlantInput[];
  startsAt?: Date;
  durationMinutes?: number;
  capacity?: number | null;
  photoUrl?: string;
}

interface NearbyFilter {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}

interface OwnedListFilter {
  q?: string;
  page?: number;
  take?: number;
}

const driveInclude = {
  ngo: true,
  _count: { select: { rsvps: { where: { status: 'confirmed' as const } } } },
  pickupPoints: { orderBy: { order: 'asc' as const } },
  plants: {
    orderBy: { order: 'asc' as const },
    include: { _count: { select: { sponsorships: { where: { status: 'succeeded' as const } } } } },
  },
};

async function findOwnedDriveOrThrow(prisma: PrismaClient, ngoUserId: string, driveId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const drive = await prisma.drive.findFirst({ where: { id: driveId, ngoId: ngo.id } });
  if (!drive) throw new NotFoundError('Drive not found');
  return drive;
}

// Read-only sibling of findOwnedDriveOrThrow — no approval check, so a
// pending/rejected/suspended NGO can still view (but not mutate) its own drive.
async function findOwnedDriveReadOnly(prisma: PrismaClient, ngoUserId: string, driveId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const drive = await prisma.drive.findFirst({ where: { id: driveId, ngoId: ngo.id } });
  if (!drive) throw new NotFoundError('Drive not found');
  return drive;
}

export async function createDrive(prisma: PrismaClient, ngoUserId: string, input: CreateDriveInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const { pickupPoints, plants, address, city, ...rest } = input;
  const geo = await geocodeAddress(`${address}, ${city}`);

  return prisma.drive.create({
    data: {
      ngoId: ngo.id,
      address,
      city,
      ...rest,
      lat: geo?.lat,
      lng: geo?.lng,
      pickupPoints: pickupPoints?.length
        ? { create: pickupPoints.map((p, i) => ({ address: p.address, arrivalBy: p.arrivalBy, order: p.order ?? i })) }
        : undefined,
      plants: plants?.length
        ? { create: plants.map((p, i) => ({ speciesName: p.speciesName, priceCents: p.priceCents, order: i })) }
        : undefined,
    },
    include: driveInclude,
  });
}

export async function updateDrive(prisma: PrismaClient, ngoUserId: string, driveId: string, input: UpdateDriveInput) {
  const drive = await findOwnedDriveOrThrow(prisma, ngoUserId, driveId);
  const { pickupPoints, plants, ...rest } = input;

  let geo: { lat: number; lng: number } | null | undefined;
  if (input.address !== undefined || input.city !== undefined) {
    const address = input.address ?? drive.address ?? '';
    const city = input.city ?? drive.city ?? '';
    geo = await geocodeAddress(`${address}, ${city}`);
  }

  return prisma.$transaction(async (tx) => {
    if (pickupPoints !== undefined) {
      // Safe to fully replace — pickup points carry no payment history.
      await tx.drivePickupPoint.deleteMany({ where: { driveId: drive.id } });
      if (pickupPoints.length) {
        await tx.drivePickupPoint.createMany({
          data: pickupPoints.map((p, i) => ({
            driveId: drive.id,
            address: p.address,
            arrivalBy: p.arrivalBy,
            order: p.order ?? i,
          })),
        });
      }
    }
    if (plants !== undefined && plants.length) {
      // Append-only: deleting/replacing existing plants would cascade-delete
      // any DrivePlantSponsorship already paid against them.
      await tx.drivePlant.createMany({
        data: plants.map((p, i) => ({ driveId: drive.id, speciesName: p.speciesName, priceCents: p.priceCents, order: i })),
      });
    }
    return tx.drive.update({
      where: { id: drive.id },
      data: {
        ...rest,
        ...(geo !== undefined ? { lat: geo?.lat ?? null, lng: geo?.lng ?? null } : {}),
      },
      include: driveInclude,
    });
  });
}

/**
 * Cancelling a drive must not leave paid sponsorships or RSVP'd attendees stranded — refund every
 * `succeeded` sponsorship via Stripe (reusing donation.service.ts's pattern) and notify everyone
 * who'd committed to this drive, since none of that used to happen at all.
 */
export async function cancelDrive(prisma: PrismaClient, ngoUserId: string, driveId: string) {
  const drive = await findOwnedDriveOrThrow(prisma, ngoUserId, driveId);

  const sponsorships = await prisma.drivePlantSponsorship.findMany({
    where: { status: 'succeeded', drivePlant: { driveId: drive.id } },
    include: { drivePlant: true },
  });

  if (sponsorships.length > 0) {
    const stripe = getStripeClient();
    for (const s of sponsorships) {
      await stripe.refunds.create({ payment_intent: s.stripePaymentIntentId });
      await prisma.drivePlantSponsorship.update({ where: { id: s.id }, data: { status: 'refunded' } });
    }
  }

  const updated = await prisma.drive.update({
    where: { id: drive.id },
    data: { status: 'cancelled' as DriveStatus },
    include: driveInclude,
  });

  const [rsvpUserIds, sponsorUserIds] = await Promise.all([
    prisma.driveRsvp.findMany({ where: { driveId: drive.id, status: 'confirmed' }, select: { userId: true } }),
    Promise.resolve(sponsorships.map((s) => ({ userId: s.userId }))),
  ]);
  const notifyUserIds = new Set([...rsvpUserIds.map((r) => r.userId), ...sponsorUserIds.map((s) => s.userId)]);

  for (const userId of notifyUserIds) {
    await notify(prisma, {
      userId,
      type: 'drive_reminder',
      data: { driveId: drive.id, driveTitle: drive.title, kind: 'cancelled' },
      push: { title: 'Drive cancelled', body: `"${drive.title}" has been cancelled by the organizer.` },
    });
  }

  return updated;
}

/**
 * Curates which completed drives headline the public profile. `Drive.featured` already drove
 * that showcase's ordering but had no endpoint behind it, so nothing could ever set it.
 */
export async function setDriveFeatured(
  prisma: PrismaClient,
  ngoUserId: string,
  driveId: string,
  featured: boolean,
) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const drive = await prisma.drive.findFirst({ where: { id: driveId, ngoId: ngo.id } });
  if (!drive) throw new NotFoundError('Drive not found');
  return prisma.drive.update({ where: { id: drive.id }, data: { featured } });
}

export async function completeDrive(prisma: PrismaClient, ngoUserId: string, driveId: string) {
  const drive = await findOwnedDriveOrThrow(prisma, ngoUserId, driveId);
  if (drive.status !== 'upcoming') throw new ConflictError('Only an upcoming drive can be marked completed');
  return prisma.drive.update({
    where: { id: drive.id },
    data: { status: 'completed' as DriveStatus },
    include: driveInclude,
  });
}

export async function listDrives(prisma: PrismaClient, filter: NearbyFilter) {
  const drives = await prisma.drive.findMany({
    where: { status: 'upcoming', ngo: { status: 'approved' } },
    include: driveInclude,
    orderBy: { startsAt: 'asc' },
    take: 500,
  });

  let results = drives.map((drive) => ({
    drive,
    distanceKm:
      filter.lat !== undefined && filter.lng !== undefined && drive.lat !== null && drive.lng !== null
        ? haversineDistanceKm({ lat: filter.lat, lng: filter.lng }, { lat: Number(drive.lat), lng: Number(drive.lng) })
        : undefined,
  }));

  if (filter.radiusKm !== undefined && filter.lat !== undefined) {
    results = results.filter((r) => (r.distanceKm ?? Infinity) <= filter.radiusKm!);
  }

  if (filter.lat !== undefined && filter.lng !== undefined) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return results.slice(0, filter.limit ?? 100);
}

export async function getDrive(prisma: PrismaClient, driveId: string, userId?: string) {
  const drive = await prisma.drive.findUnique({ where: { id: driveId }, include: driveInclude });
  if (!drive) throw new NotFoundError('Drive not found');

  let isRsvped = false;
  if (userId) {
    const rsvp = await prisma.driveRsvp.findUnique({ where: { driveId_userId: { driveId, userId } } });
    isRsvped = rsvp?.status === 'confirmed';
  }

  return { ...drive, isRsvped };
}

/** Drives a regular user has RSVP'd to — for their profile's Drives tab. */
export async function listJoinedDrives(prisma: PrismaClient, userId: string) {
  return prisma.drive.findMany({
    where: { rsvps: { some: { userId, status: 'confirmed' } } },
    include: driveInclude,
    orderBy: { startsAt: 'desc' },
  });
}

/** Drives any current member of the group has RSVP'd to, deduped — a group has no RSVP of its own. */
export async function listGroupDrives(prisma: PrismaClient, groupId: string) {
  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return [];

  return prisma.drive.findMany({
    where: { rsvps: { some: { userId: { in: memberIds }, status: 'confirmed' } } },
    include: driveInclude,
    orderBy: { startsAt: 'desc' },
  });
}

export async function listOwnedDrives(prisma: PrismaClient, ngoUserId: string, filter: OwnedListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.drive.findMany({
    where: {
      ngoId: ngo.id,
      ...(filter.q ? { title: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    },
    include: driveInclude,
    orderBy: { startsAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
}

export async function listDriveAttendees(prisma: PrismaClient, ngoUserId: string, driveId: string, filter: OwnedListFilter = {}) {
  const drive = await findOwnedDriveReadOnly(prisma, ngoUserId, driveId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [rsvps, total] = await Promise.all([
    prisma.driveRsvp.findMany({
      where: { driveId: drive.id, status: 'confirmed' },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: { id: true, createdAt: true, user: { select: { name: true, handle: true } } },
    }),
    prisma.driveRsvp.count({ where: { driveId: drive.id, status: 'confirmed' } }),
  ]);

  return { attendees: rsvps, total };
}

export async function rsvp(prisma: PrismaClient, userId: string, driveId: string) {
  return prisma.$transaction(async (tx) => {
    const drive = await tx.drive.findUnique({ where: { id: driveId } });
    if (!drive || drive.status !== 'upcoming') throw new NotFoundError('Drive not found');

    const existing = await tx.driveRsvp.findUnique({ where: { driveId_userId: { driveId, userId } } });
    if (existing?.status === 'confirmed') throw new ConflictError('Already RSVP’d to this drive');

    if (drive.capacity !== null) {
      const confirmedCount = await tx.driveRsvp.count({ where: { driveId, status: 'confirmed' } });
      if (confirmedCount >= drive.capacity) throw new ConflictError('This drive is full');
    }

    if (existing) {
      return tx.driveRsvp.update({ where: { id: existing.id }, data: { status: 'confirmed' } });
    }
    return tx.driveRsvp.create({ data: { driveId, userId, status: 'confirmed' } });
  });
}

export async function cancelRsvp(prisma: PrismaClient, userId: string, driveId: string) {
  const result = await prisma.driveRsvp.updateMany({
    where: { driveId, userId, status: 'confirmed' },
    data: { status: 'cancelled' },
  });
  if (result.count === 0) throw new NotFoundError('RSVP not found');
}

export async function sponsorPlant(prisma: PrismaClient, userId: string, driveId: string, plantId: string) {
  const plant = await prisma.drivePlant.findFirst({ where: { id: plantId, driveId }, include: { drive: true } });
  if (!plant) throw new NotFoundError('Plant not found');
  if (plant.drive.status !== 'upcoming') throw new ConflictError('This drive is no longer accepting sponsorships');

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: plant.priceCents,
    currency: 'inr',
    metadata: { drivePlantId: plant.id, driveId: plant.driveId, userId },
  });

  const sponsorship = await prisma.drivePlantSponsorship.create({
    data: {
      drivePlantId: plant.id,
      userId,
      amountCents: plant.priceCents,
      currency: 'inr',
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    },
  });

  return { sponsorship, clientSecret: paymentIntent.client_secret };
}
