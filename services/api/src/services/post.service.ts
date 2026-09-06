import { Prisma, PrismaClient } from '@plant/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile } from './ngo.service';
import { requireApprovedNurseryProfile } from './nursery.service';
import { recordUpdatePostedThisWeek } from './ngoStreak.service';
import { evaluateNgoAchievements } from './ngoAchievement.service';
import { recordNurseryActiveToday } from './nurseryStreak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { notify, notifyFollowersOfNewPost, notifyFollowersOfNewNurseryPost } from './notification.service';
import { BlockedIds, getBlockedIds } from './block.service';

export const MAX_MEDIA_PER_POST = 6;
/** Posts a single account may create per hour, across both user and NGO authorship. */
const POST_RATE_LIMIT_PER_HOUR = 20;
/** Open reports that auto-hide a post pending admin review. */
const AUTO_HIDE_REPORT_THRESHOLD = 3;

export const postInclude = {
  user: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
  ngo: { select: { id: true, orgName: true, logoUrl: true } },
  nursery: { select: { id: true, nurseryName: true, logoUrl: true } },
  drive: { select: { id: true, title: true } },
  tree: { select: { id: true, nickname: true } },
  media: { orderBy: { order: 'asc' as const }, select: { id: true, url: true, order: true } },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }> & {
  likes?: { id: string }[];
  saves?: { id: string }[];
};

/**
 * One wire shape for every post surface.
 *
 * `photoUrl` is the first media item repeated at the top level. It exists purely so the pre-
 * existing `/api/ngo/updates` and `/api/follows/feed` consumers (the web dashboard's Updates page
 * and member Following feed) keep working untouched after NgoUpdate was folded into Post — new
 * clients should read `media` instead.
 */
export function serializePost(post: PostWithRelations, viewerId?: string) {
  const author = post.ngo
    ? {
        kind: 'ngo' as const,
        id: post.ngo.id,
        name: post.ngo.orgName,
        imageUrl: post.ngo.logoUrl,
        handle: null as string | null,
        avatarEmoji: null as string | null,
      }
    : post.nursery
      ? {
          kind: 'nursery' as const,
          id: post.nursery.id,
          name: post.nursery.nurseryName,
          imageUrl: post.nursery.logoUrl,
          handle: null as string | null,
          avatarEmoji: null as string | null,
        }
      : {
          kind: 'user' as const,
          id: post.user?.id ?? '',
          name: post.user?.name ?? 'Unknown',
          imageUrl: null as string | null,
          handle: post.user?.handle ?? null,
          avatarEmoji: post.user?.avatarEmoji ?? null,
        };

  return {
    id: post.id,
    authorType: post.authorType,
    author,
    caption: post.caption,
    media: post.media.map((m) => ({ id: m.id, url: m.url, order: m.order })),
    driveId: post.driveId,
    driveTitle: post.drive?.title ?? null,
    treeId: post.treeId,
    treeNickname: post.tree?.nickname ?? null,
    likeCount: post.likeCount,
    likedByMe: (post.likes?.length ?? 0) > 0,
    savedByMe: (post.saves?.length ?? 0) > 0,
    isHidden: post.isHidden,
    isMine: viewerId != null && post.userId === viewerId,
    createdAt: post.createdAt,

    // --- legacy NgoUpdate keys, kept for apps/web ---
    ngoId: post.ngoId,
    ngoName: post.ngo?.orgName,
    ngoLogoUrl: post.ngo?.logoUrl,
    nurseryId: post.nurseryId,
    photoUrl: post.media[0]?.url ?? null,
  };
}

/** Adds the viewer's own like/save rows so `likedByMe` / `savedByMe` can be filled in. */
export function viewerInclude(viewerId?: string) {
  if (!viewerId) return postInclude;
  return {
    ...postInclude,
    likes: { where: { userId: viewerId }, select: { id: true } },
    saves: { where: { userId: viewerId }, select: { id: true } },
  };
}

/**
 * Visibility rules shared by every read path:
 *  - hidden posts are visible only to their author (flagged "under review" in the UI)
 *  - blocked accounts drop out in both directions
 */
function visibilityWhere(viewerId: string, blocked: BlockedIds): Prisma.PostWhereInput {
  const notBlocked: Prisma.PostWhereInput[] = [];
  if (blocked.userIds.length) notBlocked.push({ userId: { notIn: blocked.userIds } });
  if (blocked.ngoIds.length) notBlocked.push({ ngoId: { notIn: blocked.ngoIds } });

  return {
    AND: [
      { OR: [{ isHidden: false }, { userId: viewerId }] },
      ...notBlocked,
    ],
  };
}

async function assertNotRateLimited(prisma: PrismaClient, viewerId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.post.count({ where: { userId: viewerId, createdAt: { gte: since } } });
  if (recent >= POST_RATE_LIMIT_PER_HOUR) {
    throw new BadRequestError('You have posted a lot in the last hour. Please try again later.');
  }
}

interface CreatePostInput {
  caption?: string;
  driveId?: string;
  treeId?: string;
  /** Share this post to one of the caller's groups' activity timelines. Unlike asNgo, this
   * never changes authorship — the post stays user-authored, just tagged for the group. */
  groupId?: string;
  mediaUrls: string[];
  /** Post as the caller's NGO rather than as themselves. Requires an approved NGO profile. */
  asNgo?: boolean;
  /** Post as the caller's nursery rather than as themselves. Requires an approved nursery profile. */
  asNursery?: boolean;
}

export async function createPost(prisma: PrismaClient, viewerId: string, input: CreatePostInput) {
  if (input.mediaUrls.length === 0 && !input.caption?.trim()) {
    throw new BadRequestError('Add a photo or a caption');
  }
  if (input.mediaUrls.length > MAX_MEDIA_PER_POST) {
    throw new BadRequestError(`A post can have at most ${MAX_MEDIA_PER_POST} photos`);
  }

  await assertNotRateLimited(prisma, viewerId);

  const ngo = input.asNgo ? await requireApprovedNgoProfile(prisma, viewerId) : null;
  const nursery = !ngo && input.asNursery ? await requireApprovedNurseryProfile(prisma, viewerId) : null;
  const asOrg = ngo ?? nursery;

  if (input.driveId) {
    // A drive tag is only meaningful for the NGO that owns it.
    const drive = await prisma.drive.findFirst({
      where: { id: input.driveId, ...(ngo ? { ngoId: ngo.id } : {}) },
    });
    if (!drive) throw new NotFoundError('Drive not found');
  }
  if (input.treeId) {
    const tree = await prisma.tree.findFirst({ where: { id: input.treeId, userId: viewerId, isDeleted: false } });
    if (!tree) throw new NotFoundError('Tree not found');
  }
  if (input.groupId && !asOrg) {
    // Members post as themselves — this is a membership check, not an ownership check
    // (unlike driveId, which is only meaningful for the NGO that owns the drive).
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId: viewerId } },
    });
    if (!membership) throw new ForbiddenError("You're not a member of this group");
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorType: ngo ? 'ngo' : nursery ? 'nursery' : 'user',
        // The owning user is recorded only for user-authored posts; an org post belongs to the
        // organisation, so it survives its operator's account being deleted.
        userId: asOrg ? null : viewerId,
        ngoId: ngo?.id ?? null,
        nurseryId: nursery?.id ?? null,
        caption: input.caption,
        driveId: input.driveId,
        treeId: asOrg ? null : input.treeId,
        groupId: asOrg ? null : input.groupId,
        media: { create: input.mediaUrls.map((url, order) => ({ url, order })) },
      },
      include: postInclude,
    });

    if (ngo) {
      // Posting is what keeps an NGO's weekly streak alive — same rule as the old update flow.
      await recordUpdatePostedThisWeek(tx as unknown as PrismaClient, ngo.id);
      await evaluateNgoAchievements(tx as unknown as PrismaClient, ngo.id);
    }
    if (nursery) {
      await recordNurseryActiveToday(tx as unknown as PrismaClient, nursery.id);
      await evaluateNurseryAchievements(tx as unknown as PrismaClient, nursery.id);
    }

    return created;
  });

  if (ngo) void notifyFollowersOfNewPost(prisma, ngo.id, post.id, ngo.orgName);
  if (nursery) void notifyFollowersOfNewNurseryPost(prisma, nursery.id, post.id, nursery.nurseryName);

  return post;
}

export async function getPost(prisma: PrismaClient, viewerId: string, postId: string) {
  const blocked = await getBlockedIds(prisma, viewerId);
  const post = await prisma.post.findFirst({
    where: { id: postId, ...visibilityWhere(viewerId, blocked) },
    include: viewerInclude(viewerId),
  });
  if (!post) throw new NotFoundError('Post not found');
  return post;
}

async function requireOwnedPost(prisma: PrismaClient, viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { ngo: true, nursery: true } });
  if (!post) throw new NotFoundError('Post not found');

  const ownsAsUser = post.userId === viewerId;
  const ownsAsNgo = post.ngo?.userId === viewerId;
  const ownsAsNursery = post.nursery?.userId === viewerId;
  if (!ownsAsUser && !ownsAsNgo && !ownsAsNursery) throw new ForbiddenError('This is not your post');

  return post;
}

/** Only the caption is editable — swapping the photos of a post people already liked isn't. */
export async function updatePostCaption(
  prisma: PrismaClient,
  viewerId: string,
  postId: string,
  caption: string | null,
) {
  await requireOwnedPost(prisma, viewerId, postId);
  return prisma.post.update({
    where: { id: postId },
    data: { caption },
    include: viewerInclude(viewerId),
  });
}

export async function deletePost(prisma: PrismaClient, viewerId: string, postId: string) {
  await requireOwnedPost(prisma, viewerId, postId);
  // Media, likes, saves, reports and notifications all cascade from the schema.
  await prisma.post.delete({ where: { id: postId } });
}

export async function likePost(prisma: PrismaClient, viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { ngo: { select: { id: true, userId: true, orgName: true } } },
  });
  if (!post || post.isHidden) throw new NotFoundError('Post not found');

  const created = await prisma.$transaction(async (tx) => {
    // createMany + skipDuplicates makes a repeat like a no-op rather than a 409, so the counter
    // is only ever incremented when a row was genuinely added.
    const result = await tx.postLike.createMany({
      data: [{ postId, userId: viewerId }],
      skipDuplicates: true,
    });
    if (result.count > 0) {
      await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    }
    return result.count > 0;
  });

  if (created) {
    const recipientId = post.userId ?? post.ngo?.userId;
    if (recipientId) {
      const liker = await prisma.user.findUnique({ where: { id: viewerId }, select: { name: true } });
      await notify(prisma, {
        userId: recipientId,
        type: 'post_like',
        actorUserId: viewerId,
        postId,
        push: { title: liker?.name ?? 'Someone', body: 'liked your post' },
      });
    }
  }

  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
  return { liked: true, likeCount: fresh?.likeCount ?? 0 };
}

export async function unlikePost(prisma: PrismaClient, viewerId: string, postId: string) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.postLike.deleteMany({ where: { postId, userId: viewerId } });
    if (result.count > 0) {
      await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
    }
  });

  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
  return { liked: false, likeCount: fresh?.likeCount ?? 0 };
}

export async function listLikers(
  prisma: PrismaClient,
  postId: string,
  filter: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 30, 50);
  const rows = await prisma.postLike.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true } } },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    likers: page.map((r) => r.user),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function savePost(prisma: PrismaClient, viewerId: string, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw new NotFoundError('Post not found');
  await prisma.savedPost.createMany({ data: [{ postId, userId: viewerId }], skipDuplicates: true });
}

export async function unsavePost(prisma: PrismaClient, viewerId: string, postId: string) {
  await prisma.savedPost.deleteMany({ where: { postId, userId: viewerId } });
}

export async function listSavedPosts(
  prisma: PrismaClient,
  viewerId: string,
  filter: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 20, 50);
  const rows = await prisma.savedPost.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: { post: { include: viewerInclude(viewerId) } },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    posts: page.map((r) => serializePost(r.post as PostWithRelations, viewerId)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * The main social feed: everything from the NGOs the viewer follows (accepted follows only) plus
 * their friends' public posts, plus their own.
 *
 * Cursor-based rather than page/offset: the old `/api/follows/feed` used skip/take, which silently
 * duplicates and skips rows whenever something new lands mid-scroll.
 */
export async function getSocialFeed(
  prisma: PrismaClient,
  viewerId: string,
  filter: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 20, 50);

  const [follows, friendships, blocked] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId, status: 'accepted' }, select: { ngoId: true, nurseryId: true } }),
    prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      select: { requesterId: true, addresseeId: true },
    }),
    getBlockedIds(prisma, viewerId),
  ]);

  const ngoIds = follows.map((f) => f.ngoId).filter((id): id is string => id != null);
  const nurseryIds = follows.map((f) => f.nurseryId).filter((id): id is string => id != null);
  const friendIds = friendships.map((f) => (f.requesterId === viewerId ? f.addresseeId : f.requesterId));

  const authorClauses: Prisma.PostWhereInput[] = [{ userId: viewerId }];
  if (ngoIds.length) authorClauses.push({ ngoId: { in: ngoIds } });
  if (nurseryIds.length) authorClauses.push({ nurseryId: { in: nurseryIds } });
  if (friendIds.length) authorClauses.push({ userId: { in: friendIds } });

  const rows = await prisma.post.findMany({
    where: { AND: [{ OR: authorClauses }, visibilityWhere(viewerId, blocked)] },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: viewerInclude(viewerId),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    posts: page.map((p) => serializePost(p as PostWithRelations, viewerId)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function listPostsByAuthor(
  prisma: PrismaClient,
  viewerId: string,
  author: { ngoId?: string; nurseryId?: string; userId?: string },
  filter: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 20, 50);
  const blocked = await getBlockedIds(prisma, viewerId);

  const rows = await prisma.post.findMany({
    where: {
      AND: [
        author.ngoId ? { ngoId: author.ngoId } : author.nurseryId ? { nurseryId: author.nurseryId } : { userId: author.userId },
        visibilityWhere(viewerId, blocked),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: viewerInclude(viewerId),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    posts: page.map((p) => serializePost(p as PostWithRelations, viewerId)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** Called after a report lands; hides the post once enough distinct people have flagged it. */
export async function applyAutoHideIfNeeded(prisma: PrismaClient, postId: string) {
  const openReports = await prisma.contentReport.count({ where: { postId, status: 'open' } });
  if (openReports >= AUTO_HIDE_REPORT_THRESHOLD) {
    await prisma.post.update({ where: { id: postId }, data: { isHidden: true } });
  }
}
