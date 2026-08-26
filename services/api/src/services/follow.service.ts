import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { notify } from './notification.service';
import { getSocialFeed } from './post.service';

async function requireApprovedNgo(prisma: PrismaClient, ngoId: string) {
  const ngo = await prisma.ngoProfile.findFirst({ where: { id: ngoId, status: 'approved' } });
  if (!ngo) throw new NotFoundError('NGO not found');
  return ngo;
}

export async function countAcceptedFollowers(prisma: PrismaClient, ngoId: string) {
  return prisma.follow.count({ where: { ngoId, status: 'accepted' } });
}

/**
 * Follows an NGO, honouring its follow policy.
 *
 * An `open` NGO accepts immediately; an `approval` NGO gets a pending row and a request
 * notification. Returns the resulting status so the client can render "Following" vs "Requested"
 * without a second round trip — the endpoint used to return a bare 204, which forced the web
 * follow button to guess.
 */
export async function followNgo(prisma: PrismaClient, userId: string, ngoId: string) {
  const ngo = await requireApprovedNgo(prisma, ngoId);
  const status = ngo.followPolicy === 'approval' ? 'pending' : 'accepted';

  const follow = await prisma.follow.upsert({
    where: { followerId_ngoId: { followerId: userId, ngoId } },
    // An existing row is left alone: re-tapping Follow must not bounce an already-accepted
    // follower back into the pending queue.
    create: {
      followerId: userId,
      ngoId,
      status,
      respondedAt: status === 'accepted' ? new Date() : null,
    },
    update: {},
  });

  const follower = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  await notify(prisma, {
    userId: ngo.userId,
    type: follow.status === 'pending' ? 'follow_request' : 'new_follower',
    actorUserId: userId,
    followId: follow.id,
    push: {
      title: follower?.name ?? 'Someone',
      body: follow.status === 'pending' ? 'wants to follow you' : 'started following you',
    },
  });

  const followersCount = await countAcceptedFollowers(prisma, ngoId);
  return { status: follow.status, followersCount };
}

export async function unfollowNgo(prisma: PrismaClient, userId: string, ngoId: string) {
  await prisma.follow.deleteMany({ where: { followerId: userId, ngoId } });
  return { status: null, followersCount: await countAcceptedFollowers(prisma, ngoId) };
}

/** NGOs the caller follows. Pending requests are included so the UI can show "Requested". */
export async function listFollowedNgos(prisma: PrismaClient, userId: string) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { ngo: { select: { id: true, orgName: true, logoUrl: true, city: true } } },
  });
  return follows.map((f) => ({ ...f.ngo, followStatus: f.status }));
}

/**
 * Back-compat wrapper for `GET /api/follows/feed`.
 *
 * The web member area still calls this and expects `{ total, updates }`, so the original key
 * names are preserved. It now reads from the unified social feed underneath. `total` is no
 * longer a real count — the feed is cursor-paginated and counting the whole thing on every page
 * was wasted work — so it reports the page size, which is all the existing consumer uses it for
 * (an empty-state check).
 */
export async function getFollowingFeed(
  prisma: PrismaClient,
  userId: string,
  filter: { page?: number; take?: number } = {},
) {
  const { posts } = await getSocialFeed(prisma, userId, { take: filter.take });
  return { total: posts.length, updates: posts };
}
