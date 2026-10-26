import { PrismaClient } from '@arth/db';
import { hashPassword } from '../utils/password';
import { ConflictError, NotFoundError } from '../utils/errors';
import * as nurseryService from './nursery.service';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';
import { cached, nurseryKey } from '../utils/ttlCache';

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

export type PartnerStatusFilter = 'active' | 'available' | 'busy' | 'inactive';

const ON_DELIVERY = { deliveries: { some: { order: { status: 'out_for_delivery' as const } } } };

function partnerStatusWhere(status?: PartnerStatusFilter) {
  if (status === 'inactive') return { isActive: false };
  if (status === 'active') return { isActive: true };
  if (status === 'busy') return { isActive: true, ...ON_DELIVERY };
  if (status === 'available') return { isActive: true, NOT: ON_DELIVERY };
  return {};
}

export async function listDeliveryPartners(
  prisma: PrismaClient,
  nurseryUserId: string,
  q: CursorQuery & { q?: string; status?: PartnerStatusFilter } = {},
) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);
  const { take, args } = cursorArgs(q, 30);
  const search = q.q?.trim();
  const partners = await prisma.deliveryPartnerProfile.findMany({
    where: {
      nurseryId: nursery.id,
      ...partnerStatusWhere(q.status),
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { user: { name: { contains: search, mode: 'insensitive' as const } } },
              { user: { handle: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, handle: true, email: true } },
      _count: { select: { deliveries: { where: { order: { status: 'out_for_delivery' } } } } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...args,
  });
  return toCursorPage(partners, take, serializePartner);
}

/** Header counts for the roster: computed in the database so they cover every rider, not just the
 * page currently loaded on the phone. */
export async function getPartnersSummary(prisma: PrismaClient, nurseryUserId: string) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);
  const base = { nurseryId: nursery.id };
  const [total, active, busy] = await Promise.all([
    prisma.deliveryPartnerProfile.count({ where: base }),
    prisma.deliveryPartnerProfile.count({ where: { ...base, isActive: true } }),
    prisma.deliveryPartnerProfile.count({ where: { ...base, ...partnerStatusWhere('busy') } }),
  ]);
  return { total, available: active - busy, busy, inactive: total - active };
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

// Live fleet snapshot for the nursery's map. A rider's position only exists on the tracking rows of
// deliveries they've started (reportLocation fans a GPS fix out to those), so a rider appears with
// a pin once any of their assigned orders is under way; assigned-but-not-started orders are still
// listed (no pin yet) so the nursery can see who is queued.
export async function getLiveFleet(prisma: PrismaClient, nurseryUserId: string) {
  const nursery = await nurseryService.getOwnProfile(prisma, nurseryUserId);
  // Several screens/devices poll this every few seconds; one DB pass per window serves them all.
  return cached(nurseryKey(nursery.id, 'liveFleet'), 4_000, () => computeLiveFleet(prisma, nursery));
}

async function computeLiveFleet(prisma: PrismaClient, nursery: Awaited<ReturnType<typeof nurseryService.getOwnProfile>>) {
  const orders = await prisma.order.findMany({
    where: { nurseryId: nursery.id, status: 'out_for_delivery', tracking: { deliveryPartnerId: { not: null } } },
    orderBy: { outForDeliveryAt: 'asc' },
    select: {
      id: true,
      user: { select: { name: true } },
      items: { select: { species: true, quantity: true } },
      address: { select: { line1: true, lat: true, lng: true } },
      tracking: { select: { deliveryPartnerId: true, startedAt: true, lat: true, lng: true, etaMinutes: true, updatedAt: true } },
    },
  });

  const partnerIds = [...new Set(orders.map((o) => o.tracking!.deliveryPartnerId!))];
  const partners = await prisma.deliveryPartnerProfile.findMany({
    where: { id: { in: partnerIds }, nurseryId: nursery.id },
    include: { user: true },
  });

  const num = (v: unknown) => (v == null ? null : Number(v));
  const riders = partners.map((p) => {
    const mine = orders.filter((o) => o.tracking!.deliveryPartnerId === p.id);
    const located = mine
      .filter((o) => o.tracking!.startedAt && o.tracking!.lat != null && o.tracking!.lng != null)
      .sort((a, b) => b.tracking!.updatedAt.getTime() - a.tracking!.updatedAt.getTime())[0];
    return {
      partnerId: p.id,
      name: p.user.name,
      phone: p.phone,
      lat: located ? num(located.tracking!.lat) : null,
      lng: located ? num(located.tracking!.lng) : null,
      updatedAt: located ? located.tracking!.updatedAt : null,
      orders: mine.map((o) => ({
        orderId: o.id,
        customerName: o.user.name,
        summary: o.items.map((i) => `${i.quantity}× ${i.species}`).join(', '),
        started: !!o.tracking!.startedAt,
        etaMinutes: o.tracking!.etaMinutes,
        destination: { label: o.address?.line1 ?? null, lat: num(o.address?.lat), lng: num(o.address?.lng) },
      })),
    };
  });

  return {
    nursery: { name: nursery.nurseryName, lat: num(nursery.lat), lng: num(nursery.lng) },
    riders,
    fetchedAt: new Date(),
  };
}

// Nursery-facing detail view of one rider: live assignments, lifetime/30-day delivery counts,
// average time from dispatch to delivery, and the most recent completed drops with the customer's
// delivery rating where one was left.
export async function getPartnerOverview(prisma: PrismaClient, nurseryUserId: string, partnerId: string) {
  const partner = await findOwnedPartnerOrThrow(prisma, nurseryUserId, partnerId);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const mine = { tracking: { deliveryPartnerId: partner.id } };

  const [current, delivered, deliveredLast30d, totalDelivered] = await Promise.all([
    prisma.order.findMany({
      where: { ...mine, status: 'out_for_delivery' },
      orderBy: { outForDeliveryAt: 'asc' },
      select: {
        id: true,
        outForDeliveryAt: true,
        user: { select: { name: true } },
        items: { select: { species: true, quantity: true } },
        tracking: { select: { startedAt: true, etaMinutes: true } },
      },
    }),
    prisma.order.findMany({
      where: { ...mine, status: 'delivered' },
      orderBy: { deliveredAt: 'desc' },
      take: 15,
      select: {
        id: true,
        outForDeliveryAt: true,
        deliveredAt: true,
        user: { select: { name: true } },
        items: { select: { species: true, quantity: true } },
        review: { select: { deliveryRating: true } },
      },
    }),
    prisma.order.count({ where: { ...mine, status: 'delivered', deliveredAt: { gte: since30d } } }),
    prisma.order.count({ where: { ...mine, status: 'delivered' } }),
  ]);

  const durations = delivered
    .filter((o) => o.outForDeliveryAt && o.deliveredAt)
    .map((o) => (o.deliveredAt!.getTime() - o.outForDeliveryAt!.getTime()) / 60000);
  const avgDeliveryMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const summarize = (items: { species: string; quantity: number }[]) =>
    items.map((i) => `${i.quantity}× ${i.species}`).join(', ');

  return {
    partner: serializePartner({ ...partner, _count: { deliveries: current.length } }),
    stats: { totalDelivered, deliveredLast30d, activeNow: current.length, avgDeliveryMinutes },
    current: current.map((o) => ({
      orderId: o.id,
      customerName: o.user.name,
      summary: summarize(o.items),
      dispatchedAt: o.outForDeliveryAt,
      started: !!o.tracking?.startedAt,
      etaMinutes: o.tracking?.etaMinutes ?? null,
    })),
    recent: delivered.map((o) => ({
      orderId: o.id,
      customerName: o.user.name,
      summary: summarize(o.items),
      deliveredAt: o.deliveredAt,
      minutes: o.outForDeliveryAt && o.deliveredAt ? Math.round((o.deliveredAt.getTime() - o.outForDeliveryAt.getTime()) / 60000) : null,
      rating: o.review?.deliveryRating ?? null,
    })),
  };
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
