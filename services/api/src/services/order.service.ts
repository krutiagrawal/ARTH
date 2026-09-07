import { PrismaClient } from '@plant/db';
import { getStripeClient } from '../lib/stripe';
import { getLiveLocation } from '../lib/deliveryProvider';
import { sendEmail } from './email.service';
import { notify } from './notification.service';
import { recordNurseryActiveToday } from './nurseryStreak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { requireCheckoutableCart } from './cart.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';

// Flat delivery fee below the free-delivery threshold — a placeholder business rule, easy to move
// to nursery-configurable pricing later without touching the checkout flow around it.
const DELIVERY_FEE_CENTS = 4900;
const FREE_DELIVERY_THRESHOLD_CENTS = 49900;

function generateDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const orderInclude = {
  items: true,
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

  return {
    id: order.id,
    status: order.status,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    currency: order.currency,
    deliveryOtp: order.deliveryOtp,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    packedAt: order.packedAt,
    outForDeliveryAt: order.outForDeliveryAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    items: order.items.map((i: any) => ({ species: i.species, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
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

export async function checkout(prisma: PrismaClient, userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new NotFoundError('Address not found');

  const { items, nurseryId } = await requireCheckoutableCart(prisma, userId);

  const subtotalCents = items.reduce((sum, i) => sum + i.stock.priceCents! * i.quantity, 0);
  const deliveryFeeCents = subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;
  const totalCents = subtotalCents + deliveryFeeCents;

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'inr',
    metadata: { orderKind: 'marketplace', userId, nurseryId },
  });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        nurseryId,
        addressId,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        stripePaymentIntentId: paymentIntent.id,
        items: {
          create: items.map((i) => ({ stockId: i.stockId, species: i.stock.species, quantity: i.quantity, unitPriceCents: i.stock.priceCents! })),
        },
      },
      include: orderInclude,
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    return created;
  });

  return { order: serializeOrder(order), clientSecret: paymentIntent.client_secret };
}

/** Invoked from the Stripe webhook — see donation.service.ts's handleStripeWebhookEvent for the sibling flows. */
export async function confirmOrderPayment(prisma: PrismaClient, paymentIntentId: string, succeeded: boolean) {
  const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId }, include: { items: true, nursery: true, user: true } });
  if (!order || order.status !== 'pending_payment') return;

  if (!succeeded) {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
    return;
  }

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
      data: { status: 'confirmed', confirmedAt: new Date(), deliveryOtp: generateDeliveryOtp() },
    });
    await tx.deliveryTracking.create({ data: { orderId: order.id, provider: 'mock' } });

    await recordNurseryActiveToday(tx, order.nurseryId);
    await evaluateNurseryAchievements(tx, order.nurseryId);
  });

  await notify(prisma, {
    userId: order.nursery.userId,
    type: 'order_placed',
    actorUserId: order.userId,
    data: { orderId: order.id, totalCents: order.totalCents },
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
    html: `<p>Hi ${order.user.name},</p><p>Your order from <strong>${order.nursery.nurseryName}</strong> for ₹${(order.totalCents / 100).toFixed(2)} is confirmed. We'll notify you as it's packed and on its way.</p>`,
  });
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
  if (order.status !== 'delivered') throw new ForbiddenError('You can only review a delivered order');

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

export async function listNurseryOrders(prisma: PrismaClient, nurseryId: string, status?: string) {
  const orders = await prisma.order.findMany({
    where: { nurseryId, ...(status ? { status: status as any } : {}) },
    include: { items: true, address: true, user: { select: { id: true, name: true, handle: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return orders;
}

async function findNurseryOrderOrThrow(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, nurseryId } });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function getNurseryOrder(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, nurseryId },
    include: { items: true, address: true, user: { select: { id: true, name: true, handle: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function markOrderPacked(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'confirmed') throw new BadRequestError('Only a confirmed order can be marked as packed');

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'packed', packedAt: new Date() } });
  await notify(prisma, { userId: order.userId, type: 'order_confirmed', data: { orderId, stage: 'packed' } });
  return updated;
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

export async function markOrderDelivered(prisma: PrismaClient, nurseryId: string, orderId: string, otp?: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (order.status !== 'out_for_delivery') throw new BadRequestError('Only a dispatched order can be marked delivered');
  if (order.deliveryOtp && otp !== order.deliveryOtp) throw new BadRequestError('Incorrect delivery OTP');

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'delivered', deliveredAt: new Date() } });
  await notify(prisma, { userId: order.userId, type: 'order_delivered', data: { orderId } });
  return updated;
}

export async function nurseryCancelOrder(prisma: PrismaClient, nurseryId: string, orderId: string) {
  const order = await findNurseryOrderOrThrow(prisma, nurseryId, orderId);
  if (!['confirmed', 'packed'].includes(order.status)) throw new BadRequestError('This order can no longer be cancelled');

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
