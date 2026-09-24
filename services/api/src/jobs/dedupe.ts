import { NotificationType, PrismaClient } from '@plant/db';

/** Has `userId` already received a notification of `type` since `since`? Scheduled jobs run
 * on a fixed tick (see scheduler.ts) and must check this before notifying, or they'd re-send
 * the same nudge on every tick for as long as the trigger condition holds. */
export async function hasRecentNotification(
  prisma: PrismaClient,
  userId: string,
  type: NotificationType,
  since: Date,
): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { userId, type, createdAt: { gte: since } },
    select: { id: true },
  });
  return existing !== null;
}

/** How many notifications of `type` has `userId` received since `since`? For jobs that need to
 * cap a repeating nudge (e.g. stop re-nagging after N reminders) rather than just throttle it to
 * once per tick. */
export async function countNotificationsSince(
  prisma: PrismaClient,
  userId: string,
  type: NotificationType,
  since: Date,
): Promise<number> {
  return prisma.notification.count({ where: { userId, type, createdAt: { gte: since } } });
}
