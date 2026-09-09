import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile } from './ngo.service';
import { requireApprovedNurseryProfile } from './nursery.service';
import { requireOwnGroup } from './group.service';
import { getBlockedIds } from './block.service';

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export function serializeStory(story: any, seenIds?: Set<string>, likedIds?: Set<string>) {
  return {
    id: story.id,
    authorType: story.authorType,
    userId: story.userId,
    ngoId: story.ngoId,
    nurseryId: story.nurseryId,
    groupId: story.groupId,
    imageUrl: story.imageUrl,
    caption: story.caption,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    seen: seenIds ? seenIds.has(story.id) : undefined,
    viewCount: story._count?.views,
    likeCount: story.likeCount ?? 0,
    likedByMe: likedIds ? likedIds.has(story.id) : undefined,
  };
}

export async function createStory(
  prisma: PrismaClient,
  viewerId: string,
  input: { imageUrl: string; caption?: string | null; asNgo?: boolean; asGroup?: boolean; asNursery?: boolean },
) {
  const ngo = input.asNgo ? await requireApprovedNgoProfile(prisma, viewerId) : null;
  const group = !ngo && input.asGroup ? await requireOwnGroup(prisma, viewerId) : null;
  const nursery = !ngo && !group && input.asNursery ? await requireApprovedNurseryProfile(prisma, viewerId) : null;
  const asOrg = ngo ?? group ?? nursery;

  return prisma.story.create({
    data: {
      authorType: ngo ? 'ngo' : group ? 'group' : nursery ? 'nursery' : 'user',
      userId: asOrg ? null : viewerId,
      ngoId: ngo?.id ?? null,
      groupId: group?.id ?? null,
      nurseryId: nursery?.id ?? null,
      imageUrl: input.imageUrl,
      caption: input.caption || null,
      expiresAt: new Date(Date.now() + STORY_TTL_MS),
    },
  });
}

/**
 * The caller's own stories, newest first, with no expiry filter — this doubles as the permanent
 * forest gallery on the profile. Includes the NGO's/Group's/nursery's stories when the caller runs one.
 */
export async function listOwnStories(prisma: PrismaClient, viewerId: string) {
  const [ngo, group, nursery] = await Promise.all([
    prisma.ngoProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.groupProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.nurseryProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
  ]);

  const stories = await prisma.story.findMany({
    where: {
      OR: [
        { userId: viewerId },
        ...(ngo ? [{ ngoId: ngo.id }] : []),
        ...(group ? [{ groupId: group.id }] : []),
        ...(nursery ? [{ nurseryId: nursery.id }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { views: true } } },
  });

  return stories.map((s) => serializeStory(s));
}

interface StoryGroup {
  author: {
    kind: 'user' | 'ngo' | 'nursery' | 'group';
    id: string;
    name: string;
    handle: string | null;
    avatarEmoji: string | null;
    imageUrl: string | null;
  };
  /** Retained so the existing mobile tray keeps working; null for NGO/nursery groups. */
  user: { id: string; name: string; handle: string; avatarEmoji: string } | null;
  stories: ReturnType<typeof serializeStory>[];
  hasUnseen: boolean;
}

/**
 * Active stories from the people and organisations the viewer follows, grouped by author.
 *
 * Groups with something unseen sort first (the ring the user hasn't tapped is what they came
 * for), then by recency. Blocked accounts drop out in both directions.
 */
export async function getStoryFeed(prisma: PrismaClient, viewerId: string): Promise<StoryGroup[]> {
  const [friendships, follows, memberships, blocked] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.follow.findMany({ where: { followerId: viewerId, status: 'accepted' }, select: { ngoId: true, nurseryId: true } }),
    prisma.groupMember.findMany({ where: { userId: viewerId }, select: { groupId: true } }),
    getBlockedIds(prisma, viewerId),
  ]);

  const friendIds = friendships
    .map((f) => (f.requesterId === viewerId ? f.addresseeId : f.requesterId))
    .filter((id) => !blocked.userIds.includes(id));
  const ngoIds = follows.map((f) => f.ngoId).filter((id): id is string => id != null && !blocked.ngoIds.includes(id));
  const nurseryIds = follows.map((f) => f.nurseryId).filter((id): id is string => id != null);
  const groupIds = memberships.map((m) => m.groupId);

  if (friendIds.length === 0 && ngoIds.length === 0 && nurseryIds.length === 0 && groupIds.length === 0) return [];

  const authorClauses = [
    ...(friendIds.length ? [{ userId: { in: friendIds } }] : []),
    ...(ngoIds.length ? [{ ngoId: { in: ngoIds } }] : []),
    ...(nurseryIds.length ? [{ nurseryId: { in: nurseryIds } }] : []),
    ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
  ];

  const stories = await prisma.story.findMany({
    where: { AND: [{ OR: authorClauses }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
      ngo: { select: { id: true, orgName: true, logoUrl: true } },
      nursery: { select: { id: true, nurseryName: true, logoUrl: true } },
      group: { select: { id: true, groupName: true, logoUrl: true, avatarEmoji: true } },
    },
  });

  if (stories.length === 0) return [];

  const storyIds = stories.map((s) => s.id);
  const [seen, liked] = await Promise.all([
    prisma.storyView.findMany({ where: { userId: viewerId, storyId: { in: storyIds } }, select: { storyId: true } }),
    prisma.storyLike.findMany({ where: { userId: viewerId, storyId: { in: storyIds } }, select: { storyId: true } }),
  ]);
  const seenIds = new Set(seen.map((v) => v.storyId));
  const likedIds = new Set(liked.map((l) => l.storyId));

  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const key = story.ngoId
      ? `ngo:${story.ngoId}`
      : story.nurseryId
        ? `nursery:${story.nurseryId}`
        : story.groupId
          ? `group:${story.groupId}`
          : `user:${story.userId}`;
    let group = groups.get(key);

    if (!group) {
      group = story.ngo
        ? {
            author: {
              kind: 'ngo',
              id: story.ngo.id,
              name: story.ngo.orgName,
              handle: null,
              avatarEmoji: null,
              imageUrl: story.ngo.logoUrl,
            },
            user: null,
            stories: [],
            hasUnseen: false,
          }
        : story.nursery
          ? {
              author: {
                kind: 'nursery',
                id: story.nursery.id,
                name: story.nursery.nurseryName,
                handle: null,
                avatarEmoji: null,
                imageUrl: story.nursery.logoUrl,
              },
              user: null,
              stories: [],
              hasUnseen: false,
            }
          : story.group
            ? {
                author: {
                  kind: 'group',
                  id: story.group.id,
                  name: story.group.groupName,
                  handle: null,
                  avatarEmoji: story.group.avatarEmoji,
                  imageUrl: story.group.logoUrl,
                },
                user: null,
                stories: [],
                hasUnseen: false,
              }
            : {
                author: {
                  kind: 'user',
                  id: story.user!.id,
                  name: story.user!.name,
                  handle: story.user!.handle,
                  avatarEmoji: story.user!.avatarEmoji,
                  imageUrl: null,
                },
                user: story.user!,
                stories: [],
                hasUnseen: false,
              };
      groups.set(key, group);
    }

    group.stories.push(serializeStory(story, seenIds, likedIds));
    if (!seenIds.has(story.id)) group.hasUnseen = true;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLatest = a.stories[a.stories.length - 1].createdAt;
    const bLatest = b.stories[b.stories.length - 1].createdAt;
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });
}

export interface RingStatus {
  hasStory: boolean;
  seen: boolean;
}

/**
 * Batch "does this avatar need a story ring, and is it seen or unseen" lookup, for any avatar
 * rendered outside the story tray/feed (profile headers, leaderboard rows, follower lists, ...).
 *
 * Privacy: an individual user with `UserSettings.publicProfile = false` only shows their ring to
 * accepted friends (and themselves) — everyone else gets no ring for that user, active story or
 * not. NGOs/nurseries/groups have no privacy concept in this app, so their rings are always
 * computed normally.
 */
export async function getRingStatus(
  prisma: PrismaClient,
  viewerId: string,
  ids: { userIds?: string[]; ngoIds?: string[]; nurseryIds?: string[]; groupIds?: string[] },
): Promise<{ users: Record<string, RingStatus>; ngos: Record<string, RingStatus>; nurseries: Record<string, RingStatus>; groups: Record<string, RingStatus> }> {
  const userIds = [...new Set(ids.userIds ?? [])];
  const ngoIds = [...new Set(ids.ngoIds ?? [])];
  const nurseryIds = [...new Set(ids.nurseryIds ?? [])];
  const groupIds = [...new Set(ids.groupIds ?? [])];

  const empty = { users: {}, ngos: {}, nurseries: {}, groups: {} };
  if (!userIds.length && !ngoIds.length && !nurseryIds.length && !groupIds.length) return empty;

  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      OR: [
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ...(ngoIds.length ? [{ ngoId: { in: ngoIds } }] : []),
        ...(nurseryIds.length ? [{ nurseryId: { in: nurseryIds } }] : []),
        ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
      ],
    },
    select: { id: true, userId: true, ngoId: true, nurseryId: true, groupId: true },
  });
  if (stories.length === 0) return empty;

  const storyIds = stories.map((s) => s.id);
  const seenRows = await prisma.storyView.findMany({
    where: { userId: viewerId, storyId: { in: storyIds } },
    select: { storyId: true },
  });
  const seenIds = new Set(seenRows.map((r) => r.storyId));

  const storyUserIds = [...new Set(stories.filter((s) => s.userId).map((s) => s.userId!))];
  const visibleUserIds = new Set(storyUserIds);
  if (storyUserIds.length > 0) {
    const privateSettings = await prisma.userSettings.findMany({
      where: { userId: { in: storyUserIds }, publicProfile: false },
      select: { userId: true },
    });
    const privateIds = privateSettings.map((s) => s.userId).filter((id) => id !== viewerId);
    if (privateIds.length > 0) {
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: viewerId, addresseeId: { in: privateIds } },
            { addresseeId: viewerId, requesterId: { in: privateIds } },
          ],
        },
        select: { requesterId: true, addresseeId: true },
      });
      const friendIds = new Set(friendships.map((f) => (f.requesterId === viewerId ? f.addresseeId : f.requesterId)));
      for (const id of privateIds) {
        if (!friendIds.has(id)) visibleUserIds.delete(id);
      }
    }
  }

  const result = { users: {}, ngos: {}, nurseries: {}, groups: {} } as {
    users: Record<string, RingStatus>;
    ngos: Record<string, RingStatus>;
    nurseries: Record<string, RingStatus>;
    groups: Record<string, RingStatus>;
  };

  for (const story of stories) {
    const seen = seenIds.has(story.id);
    let bucket: Record<string, RingStatus> | null = null;
    let key: string | null = null;

    if (story.userId) {
      if (!visibleUserIds.has(story.userId)) continue;
      bucket = result.users;
      key = story.userId;
    } else if (story.ngoId) {
      bucket = result.ngos;
      key = story.ngoId;
    } else if (story.nurseryId) {
      bucket = result.nurseries;
      key = story.nurseryId;
    } else if (story.groupId) {
      bucket = result.groups;
      key = story.groupId;
    }
    if (!bucket || !key) continue;

    const existing = bucket[key];
    // "seen" only once every active story for this author has been viewed.
    bucket[key] = existing ? { hasStory: true, seen: existing.seen && seen } : { hasStory: true, seen };
  }

  return result;
}

export async function markStoryViewed(prisma: PrismaClient, viewerId: string, storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!story) throw new NotFoundError('Story not found');
  // Re-watching is not a new view, so a duplicate is a silent no-op.
  await prisma.storyView.createMany({ data: [{ storyId, userId: viewerId }], skipDuplicates: true });
}

/** Throws if `viewerId` doesn't own the account that posted `storyId` — mirrors deleteStory's check. */
async function assertOwnsStory(prisma: PrismaClient, viewerId: string, storyId: string) {
  const [ngo, group, nursery] = await Promise.all([
    prisma.ngoProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.groupProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.nurseryProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
  ]);

  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      OR: [
        { userId: viewerId },
        ...(ngo ? [{ ngoId: ngo.id }] : []),
        ...(group ? [{ groupId: group.id }] : []),
        ...(nursery ? [{ nurseryId: nursery.id }] : []),
      ],
    },
    select: { id: true },
  });
  if (!story) throw new NotFoundError('Story not found');
}

/** Viewers of a story, each flagged with whether they also liked it (Instagram's combined sheet). */
export async function listStoryViewers(prisma: PrismaClient, ownerId: string, storyId: string) {
  await assertOwnsStory(prisma, ownerId, storyId);

  const [views, likes] = await Promise.all([
    prisma.storyView.findMany({
      where: { storyId },
      include: { user: { select: { id: true, name: true, avatarEmoji: true, handle: true } } },
      orderBy: { viewedAt: 'desc' },
    }),
    prisma.storyLike.findMany({ where: { storyId }, select: { userId: true } }),
  ]);
  const likedUserIds = new Set(likes.map((l) => l.userId));

  return views.map((v) => ({ ...v, liked: likedUserIds.has(v.userId) }));
}

export async function likeStory(prisma: PrismaClient, viewerId: string, storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story || story.expiresAt <= new Date()) throw new NotFoundError('Story not found');

  await prisma.$transaction(async (tx) => {
    // createMany + skipDuplicates makes a repeat like a no-op rather than a 409, mirroring
    // postService.likePost — the counter only moves when a row was genuinely added.
    const result = await tx.storyLike.createMany({ data: [{ storyId, userId: viewerId }], skipDuplicates: true });
    if (result.count > 0) {
      await tx.story.update({ where: { id: storyId }, data: { likeCount: { increment: 1 } } });
    }
  });

  const fresh = await prisma.story.findUnique({ where: { id: storyId }, select: { likeCount: true } });
  return { liked: true, likeCount: fresh?.likeCount ?? 0 };
}

export async function unlikeStory(prisma: PrismaClient, viewerId: string, storyId: string) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.storyLike.deleteMany({ where: { storyId, userId: viewerId } });
    if (result.count > 0) {
      await tx.story.update({ where: { id: storyId }, data: { likeCount: { decrement: 1 } } });
    }
  });

  const fresh = await prisma.story.findUnique({ where: { id: storyId }, select: { likeCount: true } });
  return { liked: false, likeCount: fresh?.likeCount ?? 0 };
}

export async function deleteStory(prisma: PrismaClient, viewerId: string, storyId: string) {
  const [ngo, group, nursery] = await Promise.all([
    prisma.ngoProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.groupProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.nurseryProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
  ]);
  const result = await prisma.story.deleteMany({
    where: {
      id: storyId,
      OR: [
        { userId: viewerId },
        ...(ngo ? [{ ngoId: ngo.id }] : []),
        ...(group ? [{ groupId: group.id }] : []),
        ...(nursery ? [{ nurseryId: nursery.id }] : []),
      ],
    },
  });
  if (result.count === 0) throw new NotFoundError('Story not found');
}

/** Public stories for one user's profile — active only, and never another account's NGO stories. */
export async function listActiveUserStories(prisma: PrismaClient, userId: string) {
  const stories = await prisma.story.findMany({
    where: { userId, authorType: 'user', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  return stories.map((s) => serializeStory(s));
}
