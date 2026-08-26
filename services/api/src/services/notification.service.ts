import { NotificationType, Prisma, PrismaClient } from '@plant/db';
import { sendPush } from './push.service';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  actorUserId?: string | null;
  actorNgoId?: string | null;
  postId?: string | null;
  followId?: string | null;
  data?: Prisma.InputJsonValue;
  /** Copy for the device push. Omit to record the in-app row only. */
  push?: { title: string; body: string };
}

/**
 * The single entry point every notification producer goes through: writes the in-app row, then
 * fires the device push without awaiting it.
 *
 * Deliberately never throws. A notification is a side effect of some other action (a like, a
 * follow, an approval) and must not be able to roll that action back — a failure here is logged
 * and dropped.
 */
export async function notify(prisma: PrismaClient, input: NotifyInput): Promise<void> {
  // Nobody needs telling about their own action.
  if (input.actorUserId && input.actorUserId === input.userId) return;

  try {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        actorUserId: input.actorUserId ?? null,
        actorNgoId: input.actorNgoId ?? null,
        postId: input.postId ?? null,
        followId: input.followId ?? null,
        data: input.data,
      },
    });

    if (input.push) {
      void sendPush(prisma, [input.userId], {
        ...input.push,
        data: { notificationId: row.id, type: input.type, postId: input.postId ?? undefined },
      });
    }
  } catch (error) {
    console.warn('[notify] could not record notification:', error);
  }
}

/**
 * Fan-out for "an NGO you follow posted".
 *
 * Written as one `createMany` rather than N `notify()` calls: a popular NGO can have tens of
 * thousands of followers, and a row-at-a-time loop inside the create-post request would hold the
 * connection open for seconds. The push goes out as a single batched Expo call for the same
 * reason.
 */
export async function notifyFollowersOfNewPost(
  prisma: PrismaClient,
  ngoId: string,
  postId: string,
  orgName: string,
): Promise<void> {
  try {
    const followers = await prisma.follow.findMany({
      where: { ngoId, status: 'accepted' },
      select: { followerId: true },
    });
    if (followers.length === 0) return;

    // Rate-limit the fan-out: if this NGO already announced a post to its followers within the
    // hour, skip the notification entirely rather than filling everyone's list during a drive.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.notification.findFirst({
      where: { actorNgoId: ngoId, type: 'new_post_from_followed', createdAt: { gte: oneHourAgo } },
      select: { id: true },
    });
    if (recent) return;

    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        type: 'new_post_from_followed' as const,
        actorNgoId: ngoId,
        postId,
      })),
      skipDuplicates: true,
    });

    void sendPush(
      prisma,
      followers.map((f) => f.followerId),
      { title: orgName, body: 'shared a new update', data: { type: 'new_post_from_followed', postId } },
    );
  } catch (error) {
    console.warn('[notify] follower fan-out failed:', error);
  }
}

function serializeNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    postId: n.postId,
    followId: n.followId,
    data: n.data,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    actor: n.actorNgo
      ? { kind: 'ngo' as const, id: n.actorNgo.id, name: n.actorNgo.orgName, imageUrl: n.actorNgo.logoUrl, handle: null }
      : n.actorUser
        ? { kind: 'user' as const, id: n.actorUser.id, name: n.actorUser.name, imageUrl: null, handle: n.actorUser.handle, avatarEmoji: n.actorUser.avatarEmoji }
        : null,
    // First image of the related post, so the row can show a thumbnail without another request.
    postThumbnailUrl: n.post?.media?.[0]?.url ?? null,
  };
}

/** Cursor-paginated so a burst of new notifications can't duplicate or skip rows mid-scroll. */
export async function listNotifications(
  prisma: PrismaClient,
  userId: string,
  filter: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 25, 50);

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: {
      actorUser: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
      actorNgo: { select: { id: true, orgName: true, logoUrl: true } },
      post: { select: { id: true, media: { orderBy: { order: 'asc' }, take: 1, select: { url: true } } } },
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    notifications: page.map(serializeNotification),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function getUnreadCount(prisma: PrismaClient, userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Marks the given ids read, or the whole list when `ids` is omitted. */
export async function markRead(prisma: PrismaClient, userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}
