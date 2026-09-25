import { PrismaClient } from '@plant/db';
import { hashPassword } from '../utils/password';
import { ConflictError, NotFoundError } from '../utils/errors';
import * as nurseryService from './nursery.service';

interface CreateDeliveryPartnerInput {
  email: string;
  password: string;
  name: string;
  handle: string;
  phone: string;
  photoUrl?: string;
}

interface UpdateDeliveryPartnerInput {
  name?: string;
  phone?: string;
  photoUrl?: string;
  isActive?: boolean;
}

function serializePartner(profile: any) {
  return {
    id: profile.id,
    name: profile.user.name,
    handle: profile.user.handle,
    email: profile.user.email,
    phone: profile.phone,
    photoUrl: profile.photoUrl,
    isActive: profile.isActive,
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
    activeOrderCount: profile._count?.deliveries ?? 0,
    createdAt: profile.createdAt,
  };
}

// Unlike every self-service register* flow in auth.service.ts, this account is created BY the
// nursery (not by the partner) — the nursery picks the initial password directly and hands it to
// the partner out of band; there's no OTP/invite step for this pass.
export async function createDeliveryPartner(prisma: PrismaClient, nurseryUserId: string, input: CreateDeliveryPartnerInput) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);

  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw new ConflictError('Email is already registered');

  const existingHandle = await prisma.user.findUnique({ where: { handle: input.handle } });
  if (existingHandle) throw new ConflictError('Handle is already taken');

  const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existingPhone) throw new ConflictError('Phone number is already registered');

  const passwordHash = await hashPassword(input.password);

  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: 'delivery_partner',
        email: input.email,
        phone: input.phone,
        passwordHash,
        name: input.name,
        handle: input.handle,
      },
    });

    await tx.userSettings.create({ data: { userId: user.id } });

    return tx.deliveryPartnerProfile.create({
      data: {
        userId: user.id,
        nurseryId: nursery.id,
        phone: input.phone,
        photoUrl: input.photoUrl,
      },
      include: { user: true },
    });
  });

  return serializePartner(profile);
}

export async function listDeliveryPartners(prisma: PrismaClient, nurseryUserId: string) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);
  const partners = await prisma.deliveryPartnerProfile.findMany({
    where: { nurseryId: nursery.id },
    include: {
      user: true,
      _count: { select: { deliveries: { where: { order: { status: 'out_for_delivery' } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return partners.map(serializePartner);
}

async function findOwnedPartnerOrThrow(prisma: PrismaClient, nurseryUserId: string, partnerId: string) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);
  const partner = await prisma.deliveryPartnerProfile.findFirst({ where: { id: partnerId, nurseryId: nursery.id }, include: { user: true } });
  if (!partner) throw new NotFoundError('Delivery partner not found');
  return partner;
}

export async function updateDeliveryPartner(prisma: PrismaClient, nurseryUserId: string, partnerId: string, input: UpdateDeliveryPartnerInput) {
  const partner = await findOwnedPartnerOrThrow(prisma, nurseryUserId, partnerId);

  if (input.phone) {
    const existingPhone = await prisma.user.findFirst({ where: { phone: input.phone, id: { not: partner.userId } } });
    if (existingPhone) throw new ConflictError('Phone number is already registered');
  }

  const [, updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: partner.userId }, data: { name: input.name, ...(input.phone ? { phone: input.phone } : {}) } }),
    prisma.deliveryPartnerProfile.update({
      where: { id: partner.id },
      data: { phone: input.phone, photoUrl: input.photoUrl, isActive: input.isActive },
      include: { user: true },
    }),
  ]);
  return serializePartner(updated);
}

export async function deactivateDeliveryPartner(prisma: PrismaClient, nurseryUserId: string, partnerId: string) {
  const partner = await findOwnedPartnerOrThrow(prisma, nurseryUserId, partnerId);
  const updated = await prisma.deliveryPartnerProfile.update({
    where: { id: partner.id },
    data: { isActive: false },
    include: { user: true },
  });
  return serializePartner(updated);
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.deliveryPartnerProfile.findUnique({
    where: { userId },
    include: { user: true, nursery: { select: { nurseryName: true } } },
  });
  if (!profile) throw new NotFoundError('Delivery partner profile not found');
  return {
    id: profile.id,
    name: profile.user.name,
    handle: profile.user.handle,
    phone: profile.phone,
    photoUrl: profile.photoUrl,
    isActive: profile.isActive,
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
    nurseryName: profile.nursery.nurseryName,
  };
}

// The partner's own queue — every order currently assigned to them and still out for delivery.
// Deliberately omits Order.handoffCode: that code is shown to the customer and told to the
// partner at drop-off, so the partner's own app must never be able to read it off the API.
export async function listMyQueue(prisma: PrismaClient, partnerUserId: string) {
  const profile = await prisma.deliveryPartnerProfile.findUnique({ where: { userId: partnerUserId } });
  if (!profile) throw new NotFoundError('Delivery partner profile not found');

  const trackingRows = await prisma.deliveryTracking.findMany({
    where: { deliveryPartnerId: profile.id, order: { status: 'out_for_delivery' } },
    include: {
      order: {
        include: {
          items: true,
          address: true,
          user: { select: { id: true, name: true, handle: true } },
          nursery: { select: { id: true, nurseryName: true, lat: true, lng: true } },
        },
      },
    },
    orderBy: { order: { outForDeliveryAt: 'asc' } },
  });

  return trackingRows.map((t) => ({
    orderId: t.order.id,
    outForDeliveryAt: t.order.outForDeliveryAt,
    startedAt: t.startedAt,
    itemCount: t.order.items.reduce((sum, i) => sum + i.quantity, 0),
    items: t.order.items.map((i) => ({ species: i.species, quantity: i.quantity })),
    customer: { name: t.order.user.name, handle: t.order.user.handle },
    address: t.order.address
      ? {
          line1: t.order.address.line1,
          line2: t.order.address.line2,
          landmark: t.order.address.landmark,
          city: t.order.address.city,
          pincode: t.order.address.pincode,
          lat: t.order.address.lat != null ? Number(t.order.address.lat) : null,
          lng: t.order.address.lng != null ? Number(t.order.address.lng) : null,
        }
      : null,
    nursery: {
      id: t.order.nursery.id,
      nurseryName: t.order.nursery.nurseryName,
      lat: t.order.nursery.lat != null ? Number(t.order.nursery.lat) : null,
      lng: t.order.nursery.lng != null ? Number(t.order.nursery.lng) : null,
    },
  }));
}

// The rider taps "Start delivery" when they actually begin the journey for this specific order —
// a separate moment from the nursery's dispatch (Order.outForDeliveryAt). Idempotent: re-tapping
// an already-started order is a no-op rather than an error, since the button just gets replaced
// by the live map once started and shouldn't be re-tappable, but a race (e.g. duplicate request)
// should never surface as a user-facing failure.
export async function startDelivery(prisma: PrismaClient, partnerUserId: string, orderId: string) {
  const profile = await prisma.deliveryPartnerProfile.findUnique({ where: { userId: partnerUserId } });
  if (!profile) throw new NotFoundError('Delivery partner profile not found');

  const tracking = await prisma.deliveryTracking.findFirst({
    where: { orderId, deliveryPartnerId: profile.id, order: { status: 'out_for_delivery' } },
  });
  if (!tracking) throw new NotFoundError('Order not found');

  if (!tracking.startedAt) {
    await prisma.deliveryTracking.update({ where: { id: tracking.id }, data: { startedAt: new Date() } });
  }
  return { started: true };
}

// One GPS fix moves every parcel this partner is currently carrying — a partner carries one
// phone, not one per order, so this fans out across their whole active queue instead of taking
// an orderId. Only orders the rider has actually started (see startDelivery) receive it — an
// assigned-but-not-yet-started order shouldn't silently start moving on the customer's map.
export async function reportLocation(prisma: PrismaClient, partnerUserId: string, input: { lat: number; lng: number }) {
  const profile = await prisma.deliveryPartnerProfile.findUnique({ where: { userId: partnerUserId } });
  if (!profile) throw new NotFoundError('Delivery partner profile not found');

  const result = await prisma.deliveryTracking.updateMany({
    where: { deliveryPartnerId: profile.id, startedAt: { not: null }, order: { status: 'out_for_delivery' } },
    data: { lat: input.lat, lng: input.lng, updatedAt: new Date() },
  });
  return { updatedOrders: result.count };
}
