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
