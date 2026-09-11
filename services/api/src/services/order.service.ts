import { Prisma, PrismaClient } from '@plant/db';
import { getStripeClient } from '../lib/stripe';
import { getLiveLocation } from '../lib/deliveryProvider';
import { sendEmail } from './email.service';
import { notify } from './notification.service';
import { recordNurseryActiveToday } from './nurseryStreak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { requireCheckoutableCart } from './cart.service';
import { BadRequestError, ForbiddenError, NotFoundError, ServiceUnavailableError } from '../utils/errors';

// Flat delivery fee below the free-delivery threshold — the platform default, used whenever a
// nursery hasn't set its own NurseryProfile.deliveryFeeCents. Easy to move to fully
// nursery-configurable pricing later without touching the checkout flow around it.
const DELIVERY_FEE_CENTS = 4900;
const FREE_DELIVERY_THRESHOLD_CENTS = 49900;
// Flat ARTH platform fee — charged on every order regardless of fulfillment type (unlike the
// delivery fee, which pickup orders skip entirely).
const PLATFORM_FEE_CENTS = 100;

function generateHandoffCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const orderInclude = {
  items: { include: { saplingUnits: { select: { id: true, status: true, speciesNameSnapshot: true } } } },
  address: true,
  nursery: { select: { id: true, nurseryName: true, logoUrl: true, lat: true, lng: true, contactPhone: true } },
  tracking: true,
  review: true,
} as const;

function serializeOrder(order: any) {
  const destination = order.address?.lat != null && order.address?.lng != null
    ? { lat: Number(order.address.lat), lng: Number(order.address.lng) }
    : null;
  const origin = order.nursery?.lat != null && order.nursery?.lng != null
    ? { lat: Number(order.nursery.lat), lng: Number(order.nursery.lng) }
    : null;

  const live = order.tracking
    ? getLiveLocation(order.tracking.provider, origin, destination, order.outForDeliveryAt)
    : null;

  const saplingUnits = (order.items ?? []).flatMap((i: any) =>
    (i.saplingUnits ?? []).map((u: any) => ({ id: u.id, status: u.status, species: u.speciesNameSnapshot })),
  );

  return {
    id: order.id,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    platformFeeCents: order.platformFeeCents,
    totalCents: order.totalCents,
    currency: order.currency,
    scheduledFor: order.scheduledFor,
    pickupWindowLabel: order.pickupWindowLabel,
    handoffCode: order.handoffCode,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    packedAt: order.packedAt,
    readyForPickupAt: order.readyForPickupAt,
    outForDeliveryAt: order.outForDeliveryAt,
    pickedUpAt: order.pickedUpAt,
    deliveredAt: order.deliveredAt,
    plantationVerifiedAt: order.plantationVerifiedAt,
    cancelledAt: order.cancelledAt,
    items: order.items.map((i: any) => ({ species: i.species, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
    saplingUnits,
    address: order.address,
    nursery: { id: order.nursery.id, nurseryName: order.nursery.nurseryName, logoUrl: order.nursery.logoUrl, contactPhone: order.nursery.contactPhone },
    tracking: order.tracking
      ? {
          riderName: order.tracking.riderName,
          riderPhone: order.tracking.riderPhone,
          lat: live?.lat ?? null,
          lng: live?.lng ?? null,
          etaMinutes: live?.etaMinutes ?? null,
        }
      : null,
    review: order.review,
  };
}

interface CheckoutInput {
  fulfillmentType: 'pickup' | 'delivery';
  addressId?: string;
  pickupWindowLabel?: string;
  scheduledFor?: string;
}

export async function checkout(prisma: PrismaClient, userId: string, input: CheckoutInput) {
  const { items, nurseryId, nursery } = await requireCheckoutableCart(prisma, userId);

  let addressId: string | undefined;
  if (input.fulfillmentType === 'delivery') {
    if (!nursery.offersDelivery) throw new BadRequestError('This nursery does not offer delivery');
    if (!input.addressId) throw new BadRequestError('An address is required for delivery');
    const address = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
    if (!address) throw new NotFoundError('Address not found');
    addressId = address.id;
  } else {
    if (!nursery.offersPickup) throw new BadRequestError('This nursery does not offer pickup');
  }

  const subtotalCents = items.reduce((sum, i) => sum + i.stock.priceCents! * i.quantity, 0);

  let deliveryFeeCents = 0;
  if (input.fulfillmentType === 'delivery') {
    if (nursery.minDeliveryOrderCents && subtotalCents < nursery.minDeliveryOrderCents) {
      throw new BadRequestError(
        `This nursery requires a minimum delivery order of ₹${(nursery.minDeliveryOrderCents / 100).toFixed(2)}`,
      );
    }
    const feeCents = nursery.deliveryFeeCents ?? DELIVERY_FEE_CENTS;
    deliveryFeeCents = subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : feeCents;
  }
  const platformFeeCents = PLATFORM_FEE_CENTS;
  const totalCents = subtotalCents + deliveryFeeCents + platformFeeCents;

  // getStripeClient() throws ServiceUnavailableError when STRIPE_SECRET_KEY isn't configured —
  // in a local/dev environment without Stripe set up, that's not a hard stop: skip creating a
  // real PaymentIntent and auto-confirm the order below instead of returning a clientSecret for
  // the client to present a payment sheet for. Lets local development exercise the full order
  // lifecycle without needing real Stripe keys or a native payment UI (which can't run in Expo Go
  // anyway). A real deployment always has STRIPE_SECRET_KEY set, so this path never triggers there.
  let stripe: ReturnType<typeof getStripeClient> | null = null;
  try {
    stripe = getStripeClient();
  } catch (e) {
    if (!(e instanceof ServiceUnavailableError)) throw e;
  }

  const paymentIntent = stripe
    ? await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'inr',
        metadata: { orderKind: 'marketplace', userId, nurseryId },
      })
    : null;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        nurseryId,
        addressId,
        fulfillmentType: input.fulfillmentType,
        pickupWindowLabel: input.fulfillmentType === 'pickup' ? input.pickupWindowLabel : undefined,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        subtotalCents,
        deliveryFeeCents,
        platformFeeCents,
        totalCents,
        stripePaymentIntentId: paymentIntent?.id,
        items: {
          create: items.map((i) => ({ stockId: i.stockId, species: i.stock.species, quantity: i.quantity, unitPriceCents: i.stock.priceCents! })),
        },
      },
      include: orderInclude,
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    return created;
  });

  if (!stripe) {
    const fullOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, nursery: true, user: true },
    });
    await finalizeConfirmedOrder(prisma, fullOrder);
    const confirmedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    return { order: serializeOrder(confirmedOrder), clientSecret: null };
  }

  return { order: serializeOrder(order), clientSecret: paymentIntent!.client_secret };
}

// Creates one ArthSaplingUnit per unit of quantity across the order's items — the traceable
// "ARTH Sapling ID" a QR code points at. One row per physical sapling, not per line item, since
// a quantity-5 OrderItem is 5 independently scannable/plantable units. Species/age are
// snapshotted from SaplingStock at issue time so a later stock edit never rewrites an
// already-printed unit's passport.
async function issueArthSaplingUnits(
  tx: Prisma.TransactionClient,
  order: { id: string; nurseryId: string; items: { id: string; stockId: string | null; species: string; quantity: number }[] },
) {
  for (const item of order.items) {
    const stock = item.stockId ? await tx.saplingStock.findUnique({ where: { id: item.stockId } }) : null;
    const data = Array.from({ length: item.quantity }, () => ({
      orderItemId: item.id,
      nurseryId: order.nurseryId,
      speciesId: stock?.speciesId ?? null,
      speciesNameSnapshot: item.species,
      ageAtSupplyLabel: stock?.ageLabel ?? null,
    }));
    if (data.length > 0) await tx.arthSaplingUnit.createMany({ data });
  }
}

type OrderForFinalization = Prisma.OrderGetPayload<{ include: { items: true; nursery: true; user: true } }>;

// Shared by the real Stripe-webhook path (confirmOrderPayment) and the dev/test-mode bypass in
// checkout() above — everything that has to happen once an order's payment is settled (stock
// decrement, ledger, status flip, delivery tracking, sapling-unit issuance, achievements,
// notifications, email), regardless of which path got it there.
async function finalizeConfirmedOrder(prisma: PrismaClient, order: OrderForFinalization) {
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.stockId) continue;
      const stock = await tx.saplingStock.findUnique({ where: { id: item.stockId } });
      if (!stock) continue;
      await tx.saplingStock.update({ where: { id: item.stockId }, data: { quantity: Math.max(0, stock.quantity - item.quantity) } });
      await tx.saplingStockLedger.create({
        data: { nurseryId: order.nurseryId, stockId: item.stockId, species: item.species, delta: -item.quantity, reason: 'order_placed' },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', confirmedAt: new Date(), handoffCode: generateHandoffCode() },
    });

    // Pickup orders never get a DeliveryTracking row — there's nothing to track en route.
    if (order.fulfillmentType === 'delivery') {
      await tx.deliveryTracking.create({ data: { orderId: order.id, provider: 'mock' } });
    }

    await issueArthSaplingUnits(tx, order);

    await recordNurseryActiveToday(tx, order.nurseryId);
    await evaluateNurseryAchievements(tx, order.nurseryId);
  });

  await notify(prisma, {
    userId: order.nursery.userId,
    type: 'order_placed',
    actorUserId: order.userId,
    data: { orderId: order.id, totalCents: order.totalCents, fulfillmentType: order.fulfillmentType },
    push: { title: order.nursery.nurseryName, body: 'You have a new order to prepare' },
  });
  await notify(prisma, {
    userId: order.userId,
    type: 'order_confirmed',
    data: { orderId: order.id, nurseryName: order.nursery.nurseryName },
    push: { title: order.nursery.nurseryName, body: 'Your order is confirmed!' },
  });

  await sendEmail({
    to: order.user.email,
    subject: 'Your PLANT order is confirmed',
    html: `<p>Hi ${order.user.name},</p><p>Your order from <strong>${order.nursery.nurseryName}</strong> for ₹${(order.totalCents / 100).toFixed(2)} is confirmed. We'll notify you as it's packed and ${order.fulfillmentType === 'pickup' ? 'ready for pickup' : 'on its way'}.</p>`,
  });
}

/** Invoked from the Stripe webhook — see donation.service.ts's handleStripeWebhookEvent for the sibling flows. */
export async function confirmOrderPayment(prisma: PrismaClient, paymentIntentId: string, succeeded: boolean) {
  const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId }, include: { items: true, nursery: true, user: true } });
  if (!order || order.status !== 'pending_payment') return;

  if (!succeeded) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
    return;
  }

  await finalizeConfirmedOrder(prisma, order);
}

export async function listMyOrders(prisma: PrismaClient, userId: string) {
  const orders = await prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: { createdAt: 'desc' } });
  return orders.map(serializeOrder);
}

export async function getMyOrder(prisma: PrismaClient, userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: orderInclude });
  if (!order) throw new NotFoundError('Order not found');
  return serializeOrder(order);
}

export async function cancelMyOrder(prisma: PrismaClient, userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new NotFoundError('Order not found');
  if (!['pending_payment', 'confirmed'].includes(order.status)) {
    throw new ForbiddenError('This order can no longer be cancelled');
  }

  if (order.status === 'confirmed' && order.stripePaymentIntentId) {
    const stripe = getStripeClient();
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    await restockCancelledOrder(prisma, order.id);
  }

  return prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
}

export async function restockCancelledOrder(prisma: PrismaClient, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.stockId) continue;
      await tx.saplingStock.update({ where: { id: item.stockId }, data: { quantity: { increment: item.quantity } } });
      await tx.saplingStockLedger.create({
        data: { nurseryId: order.nurseryId, stockId: item.stockId, species: item.species, delta: item.quantity, reason: 'order_cancelled' },
      });
    }
    // Void this order's sapling units so a cancelled order's already-printed QR can never later
    // be scanned into a Tree.
    await tx.arthSaplingUnit.updateMany({
      where: { orderItemId: { in: order.items.map((i) => i.id) }, status: { in: ['issued', 'collected'] } },
      data: { status: 'void' },
    });
  });
}

// Admin-triggered refund — same Stripe refund + restock as the user/nursery
// self-service cancel paths above, just reachable regardless of who owns the
// order (dispute resolution). Logs to AdminActionLog like every other admin
// mutation (see admin.service.ts).
export async function adminRefundOrder(prisma: PrismaClient, orderId: string, input: { reason?: string; adminUserId: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  if (order.status === 'cancelled') throw new ForbiddenError('This order is already cancelled');

  if (order.stripePaymentIntentId) {
    const stripe = getStripeClient();
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  }
  if (order.status !== 'pending_payment') {
    await restockCancelledOrder(prisma, order.id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'order.refunded',
        targetType: 'Order',
        targetId: order.id,
        reason: input.reason ?? null,
      },
    });
    return result;
  });

  await notify(prisma, {
    userId: order.userId,
    type: 'order_cancelled',
    data: { orderId },
    push: { title: 'Order refunded', body: 'ARTH support has cancelled and refunded this order.' },
  });

  return updated;
}

export async function submitOrderReview(
  prisma: PrismaClient,
  userId: string,
  orderId: string,
  input: { nurseryRating: number; deliveryRating?: number; comment?: string },
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new NotFoundError('Order not found');
  // A review is about "did you get your saplings", which for a pickup order means picked_up
  // (there's no separate 'delivered' state on that branch) — allow either terminal handoff
  // state, plus the fully-verified state reached afterwards.
  if (!['delivered', 'picked_up', 'plantation_verified'].includes(order.status)) {
    throw new ForbiddenError('You can only review an order you have received');
  }

  const existing = await prisma.orderReview.findUnique({ where: { orderId } });
  if (existing) throw new ForbiddenError('You already reviewed this order');

  return prisma.$transaction(async (tx) => {
    const review = await tx.orderReview.create({
      data: { orderId, userId, nurseryId: order.nurseryId, ...input },
    });

    const agg = await tx.orderReview.aggregate({ where: { nurseryId: order.nurseryId }, _avg: { nurseryRating: true }, _count: true });
    await tx.nurseryProfile.update({
      where: { id: order.nurseryId },
      data: { avgRating: agg._avg.nurseryRating, reviewCount: agg._count },
    });

    return review;
  });
}

// ---------- Nursery-side order management (mirrors reservation fulfil/decline in nursery.service.ts) ----------

export async function listNurseryOrders(
  prisma: PrismaClient,
  nurseryId: string,
  filter: { status?: string; fulfillmentType?: string } = {},
) {
  const orders = await prisma.order.findMany({
    where: {
      nurseryId,
      ...(filter.status ? { status: filter.status as any } : {}),
      ...(filter.fulfillmentType ? { fulfillmentType: filter.fulfillmentType as any } : {}),
    },
    include: { items: true, address: true, user: { select: { id: true, name: true, handle: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return orders;
}

async function findNurseryOrderOrThrow(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, nurseryId },
    include: { nursery: { select: { nurseryName: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function getNurseryOrder(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, nurseryId },
    include: {
      items: { include: { saplingUnits: { select: { id: true, status: true, speciesNameSnapshot: true } } } },
      address: true,
      user: { select: { id: true, name: true, handle: true } },
    },
  });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function markOrderPacked(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'confirmed') throw new BadRequestError('Only a confirmed order can be marked as packed');

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'packed', packedAt: new Date() } });
  await notify(prisma, {
    userId: order.userId,
    type: 'order_confirmed',
    data: { orderId, stage: 'packed' },
    push: { title: 'Order packed 📦', body: `${order.nursery.nurseryName} just packed your saplings — ${order.fulfillmentType === 'pickup' ? "we'll let you know when they're ready" : 'on their way soon'}.` },
  });
  return updated;
}

export async function markOrderReadyForPickup(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.fulfillmentType !== 'pickup') throw new BadRequestError('Only a pickup order can be marked ready for pickup');
  if (order.status !== 'packed') throw new BadRequestError('Only a packed order can be marked ready for pickup');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'ready_for_pickup', readyForPickupAt: new Date(), handoffCode: order.handoffCode ?? generateHandoffCode() },
  });
  await notify(prisma, {
    userId: order.userId,
    type: 'order_ready_for_pickup',
    data: { orderId },
    push: { title: order.nursery.nurseryName, body: 'Your saplings are ready for pickup!' },
  });
  return updated;
}

export async function markOrderPickedUp(prisma: PrismaClient, nurseryId: string, orderId: string, code?: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'ready_for_pickup') throw new BadRequestError('Only an order ready for pickup can be marked picked up');
  if (order.handoffCode && code !== order.handoffCode) throw new BadRequestError('Incorrect handoff code');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'picked_up', pickedUpAt: new Date() } });
    await tx.arthSaplingUnit.updateMany({
      where: { orderItem: { orderId } },
      data: { status: 'collected', collectedAt: new Date() },
    });
  });

  await notify(prisma, {
    userId: order.userId,
    type: 'order_picked_up',
    data: { orderId },
    push: { title: '🎉 Picked up!', body: 'Your saplings are in your hands. Time to get planting.' },
  });
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

export async function markOrderOutForDelivery(
  prisma: PrismaClient,
  nurseryId: string,
  orderId: string,
  rider?: { name?: string; phone?: string },
) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'packed') throw new BadRequestError('Only a packed order can be dispatched');

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id: orderId }, data: { status: 'out_for_delivery', outForDeliveryAt: new Date() } });
    await tx.deliveryTracking.update({
      where: { orderId },
      data: { riderName: rider?.name, riderPhone: rider?.phone, updatedAt: new Date() },
    });
    return o;
  });

  await notify(prisma, {
    userId: order.userId,
    type: 'order_out_for_delivery',
    data: { orderId },
    push: { title: 'Your saplings are on the way!', body: 'Track your delivery live in the app.' },
  });
  return updated;
}

export async function markOrderDelivered(prisma: PrismaClient, nurseryId: string, orderId: string, code?: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'out_for_delivery') throw new BadRequestError('Only a dispatched order can be marked delivered');
  if (order.handoffCode && code !== order.handoffCode) throw new BadRequestError('Incorrect handoff code');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'delivered', deliveredAt: new Date() } });
    await tx.arthSaplingUnit.updateMany({
      where: { orderItem: { orderId } },
      data: { status: 'collected', collectedAt: new Date() },
    });
  });

  await notify(prisma, {
    userId: order.userId,
    type: 'order_delivered',
    data: { orderId },
    push: { title: '🎉 Delivered!', body: 'Your saplings have arrived. Time to get your hands dirty.' },
  });
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

export async function nurseryCancelOrder(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  // 'ready_for_pickup' is included so a nursery can cancel a no-show pickup rather than holding
  // the reserved stock hostage indefinitely.
  if (!['confirmed', 'packed', 'ready_for_pickup'].includes(order.status)) {
    throw new BadRequestError('This order can no longer be cancelled');
  }

  if (order.stripePaymentIntentId) {
    const stripe = getStripeClient();
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  }
  await restockCancelledOrder(prisma, order.id);

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled', cancelledAt: new Date() } });
  await notify(prisma, {
    userId: order.userId,
    type: 'order_cancelled',
    data: { orderId },
    push: { title: 'Order cancelled', body: 'Your nursery had to cancel this order — you have been refunded.' },
  });
  return updated;
}

// Exported for tree.service.ts's plantTree to call once a scanned unit's Tree is AI/GPS-verified
// — the only place an order can reach its true terminal state (a delivered/picked-up order isn't
// "done" until what was in the box actually became a living tree). Never notifies itself (it may
// run inside another service's transaction); the caller notifies post-commit if this returns true.
export async function maybeMarkOrderPlantationVerified(tx: Prisma.TransactionClient, orderId: string): Promise<boolean> {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order || !['picked_up', 'delivered'].includes(order.status)) return false;

  const units = await tx.arthSaplingUnit.findMany({
    where: { orderItem: { orderId } },
    include: { tree: { select: { aiVerificationStatus: true } } },
  });
  if (units.length === 0) return false;
  const allVerified = units.every((u) => u.status === 'planted' && u.tree?.aiVerificationStatus === 'verified');
  if (!allVerified) return false;

  await tx.order.update({ where: { id: orderId }, data: { status: 'plantation_verified', plantationVerifiedAt: new Date() } });
  return true;
}
