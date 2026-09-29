import { PrismaClient } from '@arth/db';
import { getStripeClient } from '../lib/stripe';
import { notify } from '../services/notification.service';
import { restockCancelledOrder } from '../services/order.service';
import { recomputeReputation, refreshFulfilmentStreak } from '../services/nurseryReputation.service';
import { ServiceUnavailableError } from '../utils/errors';

// An order sitting this long in 'ready_for_pickup' or 'out_for_delivery' with nobody ever
// completing the handoff is almost always a no-show, not a delayed-but-still-happening pickup —
// left alone, it holds the nursery's stock hostage indefinitely (see the cancel-button status
// mismatch this pairs with: a nursery can now cancel these manually, but shouldn't have to notice
// every stale one themselves).
const STUCK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Terminal-ish transition like bulkRequirementOverdue.job.ts's own reasoning: once an order
 * leaves ready_for_pickup/out_for_delivery, this job's own filter naturally never re-selects it
 * again — no separate dedupe check needed. */
export async function runStuckOrdersJob(prisma: PrismaClient): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

    const stuck = await prisma.order.findMany({
      where: {
        OR: [
          { status: 'ready_for_pickup', readyForPickupAt: { lt: cutoff } },
          { status: 'out_for_delivery', outForDeliveryAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        userId: true,
        nurseryId: true,
        stripePaymentIntentId: true,
        nursery: { select: { userId: true, nurseryName: true } },
      },
    });
    if (stuck.length === 0) return;

    for (const order of stuck) {
      try {
        if (order.stripePaymentIntentId) {
          try {
            const stripe = getStripeClient();
            await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
          } catch (e) {
            if (!(e instanceof ServiceUnavailableError)) throw e;
          }
        }
        await restockCancelledOrder(prisma, order.id);

        await prisma.$transaction(async (tx) => {
          await tx.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
          await refreshFulfilmentStreak(tx, order.nurseryId);
          await recomputeReputation(tx, order.nurseryId);
        });

        await notify(prisma, {
          userId: order.userId,
          type: 'order_cancelled',
          data: { orderId: order.id, reason: 'unclaimed' },
          push: { title: order.nursery.nurseryName, body: "This order wasn't collected in time and was automatically cancelled and refunded." },
        });
        await notify(prisma, {
          userId: order.nursery.userId,
          type: 'order_cancelled',
          data: { orderId: order.id, reason: 'unclaimed' },
          push: { title: 'Order auto-cancelled', body: 'An unclaimed order sat too long and was automatically cancelled — its stock is back in your inventory.' },
        });
      } catch (error) {
        console.warn('[jobs] failed to auto-cancel stuck order', order.id, error);
      }
    }
  } catch (error) {
    console.warn('[jobs] stuck-orders failed:', error);
  }
}
