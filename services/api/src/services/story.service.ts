import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile } from './ngo.service';
import { requireOwnGroup } from './group.service';
import { getBlockedIds } from './block.service';

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export function serializeStory(story: any, seenIds?: Set<string>) {
  return {
    id: story.id,
    authorType: story.authorType,
    userId: story.userId,
    ngoId: story.ngoId,
    groupId: story.groupId,
    imageUrl: story.imageUrl,
    caption: story.caption,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    seen: seenIds ? seenIds.has(story.id) : undefined,
    viewCount: story._count?.views,
  };
}

export async function createStory(
  prisma: PrismaClient,
  viewerId: string,
  input: { imageUrl: string; caption?: string | null; asNgo?: boolean; asGroup?: boolean },
) {
  const ngo = input.asNgo ? await requireApprovedNgoProfile(prisma, viewerId) : null;
  const group = !ngo && input.asGroup ? await requireOwnGroup(prisma, viewerId) : null;

  return prisma.story.create({
    data: {
      authorType: ngo ? 'ngo' : group ? 'group' : 'user',
      userId: ngo || group ? null : viewerId,
      ngoId: ngo?.id ?? null,
      groupId: group?.id ?? null,
      imageUrl: input.imageUrl,
      caption: input.caption || null,
      expiresAt: new Date(Date.now() + STORY_TTL_MS),
    },
  });
}

/**
 * The caller's own stories, newest first, with no expiry filter — this doubles as the permanent
 * forest gallery on the profile. Includes the NGO's/Group's stories when the caller runs one.
 */
export async function listOwnStories(prisma: PrismaClient, viewerId: string) {
  const [ngo, group] = await Promise.all([
    prisma.ngoProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.groupProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
  ]);

  const stories = await prisma.story.findMany({
    where: {
      OR: [{ userId: viewerId }, ...(ngo ? [{ ngoId: ngo.id }] : []), ...(group ? [{ groupId: group.id }] : [])],
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { views: true } } },
  });

  return stories.map((s) => serializeStory(s));
}

interface StoryGroup {
  author: {
    kind: 'user' | 'ngo';
    id: string;
    name: string;
    handle: string | null;
    avatarEmoji: string | null;
    imageUrl: string | null;
  };
  /** Retained so the existing mobile tray keeps working; null for NGO groups. */
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
  const [friendships, follows, blocked] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.follow.findMany({ where: { followerId: viewerId, status: 'accepted' }, select: { ngoId: true } }),
    getBlockedIds(prisma, viewerId),
  ]);

  const friendIds = friendships
    .map((f) => (f.requesterId === viewerId ? f.addresseeId : f.requesterId))
    .filter((id) => !blocked.userIds.includes(id));
  const ngoIds = follows.map((f) => f.ngoId).filter((id) => !blocked.ngoIds.includes(id));

  if (friendIds.length === 0 && ngoIds.length === 0) return [];

  const authorClauses = [
    ...(friendIds.length ? [{ userId: { in: friendIds } }] : []),
    ...(ngoIds.length ? [{ ngoId: { in: ngoIds } }] : []),
  ];

  const stories = await prisma.story.findMany({
    where: { AND: [{ OR: authorClauses }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
      ngo: { select: { id: true, orgName: true, logoUrl: true } },
    },
  });

  if (stories.length === 0) return [];

  const seen = await prisma.storyView.findMany({
    where: { userId: viewerId, storyId: { in: stories.map((s) => s.id) } },
    select: { storyId: true },
  });
  const seenIds = new Set(seen.map((v) => v.storyId));

  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const key = story.ngoId ? `ngo:${story.ngoId}` : `user:${story.userId}`;
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

    group.stories.push(serializeStory(story, seenIds));
    if (!seenIds.has(story.id)) group.hasUnseen = true;
  }

  return [...groups.values()].sort((a, b) => {
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLatest = a.stories[a.stories.length - 1].createdAt;
    const bLatest = b.stories[b.stories.length - 1].createdAt;
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });
}

export async function markStoryViewed(prisma: PrismaClient, viewerId: string, storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!story) throw new NotFoundError('Story not found');
  // Re-watching is not a new view, so a duplicate is a silent no-op.
  await prisma.storyView.createMany({ data: [{ storyId, userId: viewerId }], skipDuplicates: true });
}

export async function deleteStory(prisma: PrismaClient, viewerId: string, storyId: string) {
  const [ngo, group] = await Promise.all([
    prisma.ngoProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
    prisma.groupProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }),
  ]);
  const result = await prisma.story.deleteMany({
    where: {
      id: storyId,
      OR: [{ userId: viewerId }, ...(ngo ? [{ ngoId: ngo.id }] : []), ...(group ? [{ groupId: group.id }] : [])],
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
