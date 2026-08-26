import { PrismaClient } from '@plant/db';
import { postInclude, serializePost } from './post.service';

interface ActivityEntry {
  kind: 'activity';
  id: string;
  createdAt: Date;
  type: string;
  user: { id: string; name: string; handle: string; avatarEmoji: string };
  referenceType: string | null;
  referenceId: string | null;
}

interface PostEntry {
  kind: 'post';
  id: string;
  createdAt: Date;
  post: ReturnType<typeof serializePost>;
}

export type GroupActivityItem = ActivityEntry | PostEntry;

/**
 * A group's activity timeline merges two independent sources rather than storing a
 * groupId on ActivityFeed: a user can belong to multiple groups, so there's no single
 * canonical group to write an activity row against at creation time. Instead this reads,
 * at request time, every ActivityFeed row belonging to a current member (mirrors
 * feed.routes.ts's `scope=friends` resolve-then-filter pattern) and merges it with posts
 * explicitly tagged with this groupId (a member choosing to share to the group).
 */
export async function getGroupActivity(
  prisma: PrismaClient,
  groupId: string,
  viewerId: string,
  filter: { take?: number } = {}
): Promise<GroupActivityItem[]> {
  const take = Math.min(filter.take ?? 30, 50);

  const memberIds = (await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
    (m) => m.userId
  );

  const [activities, posts] = await Promise.all([
    memberIds.length > 0
      ? prisma.activityFeed.findMany({
          where: { userId: { in: memberIds } },
          include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: { groupId },
      include: { ...postInclude, likes: { where: { userId: viewerId }, select: { id: true } }, saves: { where: { userId: viewerId }, select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);

  const merged: GroupActivityItem[] = [
    ...activities.map((a) => ({
      kind: 'activity' as const,
      id: a.id,
      createdAt: a.createdAt,
      type: a.type,
      user: a.user,
      referenceType: a.referenceType,
      referenceId: a.referenceId,
    })),
    ...posts.map((p) => ({
      kind: 'post' as const,
      id: p.id,
      createdAt: p.createdAt,
      post: serializePost(p as any, viewerId),
    })),
  ];

  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged.slice(0, take);
}
