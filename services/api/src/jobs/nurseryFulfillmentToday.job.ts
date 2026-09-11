import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';
import { startOfUtcDay, addDays } from '../services/streak.service';

/**
 * Orders scheduled (pickup or delivery) for today, still sitting before handoff — nudges both
 * the nursery ("today's fulfilment") and the customer ("today's your pickup/delivery day").
 * Dedup is per-order (via Notification.data.orderId), not per-user, since one nursery can have
 * several orders scheduled the same day and each needs its own nudge.
 */
export async function runNurseryFulfillmentTodayJob(prisma: PrismaClient): Promise<void> {
  try {
    const todayStart = startOfUtcDay(new Date());
    const todayEnd = addDays(todayStart, 1);

    const orders = await prisma.order.findMany({
      where: {
        scheduledFor: { gte: todayStart, lt: todayEnd },
        status: { in: ['confirmed', 'packed', 'ready_for_pickup'] },
      },
      include: { nursery: { select: { userId: true, nurseryName: true } }, user: { select: { id: true } } },
    });

    for (const order of orders) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: { type: 'order_fulfillment_today', data: { path: ['orderId'], equals: order.id } },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      const label = order.fulfillmentType === 'pickup' ? 'pickup' : 'delivery';
      await notify(prisma, {
        userId: order.nursery.userId,
        type: 'order_fulfillment_today',
        data: { orderId: order.id, fulfillmentType: order.fulfillmentType },
        push: { title: `${label === 'pickup' ? 'Pickup' : 'Delivery'} scheduled today`, body: `Order for ${order.nursery.nurseryName} is due today.` },
      });
      await notify(prisma, {
        userId: order.user.id,
        type: 'order_fulfillment_today',
        data: { orderId: order.id, fulfillmentType: order.fulfillmentType },
        push: { title: `Your ${label} is today!`, body: `${order.nursery.nurseryName} has your saplings ready for today's ${label}.` },
      });
    }
  } catch (error) {
    console.warn('[jobs] nursery-fulfillment-today failed:', error);
  }
}
