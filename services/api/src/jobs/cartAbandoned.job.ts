import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';
import { hasRecentNotification } from './dedupe';

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
// Re-nag once a day while the cart is still sitting there, rather than a one-shot — matches how
// Swiggy/Zomato-style abandoned-cart pushes behave.
const RENAG_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * `CartItem` is a real persisted table (packages/db/prisma/schema.prisma), scoped to one nursery
 * at a time by convention. For each user with stale cart items, checks whether an order for that
 * same nursery was placed after the cart was last touched (i.e. they already checked out) before
 * notifying.
 */
export async function runCartAbandonedJob(prisma: PrismaClient): Promise<void> {
  try {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);

    const staleItems = await prisma.cartItem.findMany({
      where: {
        updatedAt: { lt: staleBefore },
        user: { isDeleted: false, OR: [{ settings: null }, { settings: { notifications: true } }] },
      },
      select: { userId: true, nurseryId: true, updatedAt: true },
    });
    if (staleItems.length === 0) return;

    const byUser = new Map<string, { nurseryId: string; oldestUpdatedAt: Date; itemCount: number }>();
    for (const item of staleItems) {
      const existing = byUser.get(item.userId);
      if (!existing) {
        byUser.set(item.userId, { nurseryId: item.nurseryId, oldestUpdatedAt: item.updatedAt, itemCount: 1 });
      } else {
        existing.itemCount += 1;
        if (item.updatedAt < existing.oldestUpdatedAt) existing.oldestUpdatedAt = item.updatedAt;
      }
    }

    const since = new Date(now.getTime() - RENAG_WINDOW_MS);
    for (const [userId, cart] of byUser) {
      const checkedOut = await prisma.order.findFirst({
        where: { userId, nurseryId: cart.nurseryId, createdAt: { gte: cart.oldestUpdatedAt } },
        select: { id: true },
      });
      if (checkedOut) continue;

      if (await hasRecentNotification(prisma, userId, 'cart_abandoned', since)) continue;

      await notify(prisma, {
        userId,
        type: 'cart_abandoned',
        data: { itemCount: cart.itemCount, nurseryId: cart.nurseryId },
        push: {
          title: 'You left something in your cart 🛒',
          body: `${cart.itemCount} sapling${cart.itemCount === 1 ? '' : 's'} still waiting for you — for now.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] cart-abandoned failed:', error);
  }
}
