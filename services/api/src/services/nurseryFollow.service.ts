import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { notify } from './notification.service';

async function requireApprovedNursery(prisma: PrismaClient, nurseryId: string) {
  const nursery = await prisma.nurseryProfile.findFirst({ where: { id: nurseryId, status: 'approved' } });
  if (!nursery) throw new NotFoundError('Nursery not found');
  return nursery;
}

export async function countAcceptedFollowers(prisma: PrismaClient, nurseryId: string) {
  return prisma.follow.count({ where: { nurseryId, status: 'accepted' } });
}

/** User-facing sibling of follow.service.ts's followNgo — same open/approval policy semantics. */
export async function followNursery(prisma: PrismaClient, userId: string, nurseryId: string) {
  const nursery = await requireApprovedNursery(prisma, nurseryId);
  const status = nursery.followPolicy === 'approval' ? 'pending' : 'accepted';

  const follow = await prisma.follow.upsert({
    where: { followerId_nurseryId: { followerId: userId, nurseryId } },
    create: {
      followerId: userId,
      nurseryId,
      status,
      respondedAt: status === 'accepted' ? new Date() : null,
    },
    update: {},
  });

  const follower = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  await notify(prisma, {
    userId: nursery.userId,
    type: follow.status === 'pending' ? 'follow_request' : 'new_follower',
    actorUserId: userId,
    followId: follow.id,
    push: {
      title: follower?.name ?? 'Someone',
      body: follow.status === 'pending' ? 'wants to follow you' : 'started following you',
    },
  });

  const followersCount = await countAcceptedFollowers(prisma, nurseryId);
  return { status: follow.status, followersCount };
}

export async function unfollowNursery(prisma: PrismaClient, userId: string, nurseryId: string) {
  await prisma.follow.deleteMany({ where: { followerId: userId, nurseryId } });
  return { status: null, followersCount: await countAcceptedFollowers(prisma, nurseryId) };
}

export async function listFollowedNurseries(prisma: PrismaClient, userId: string) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId, nurseryId: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: { nursery: { select: { id: true, nurseryName: true, logoUrl: true, city: true } } },
  });
  return follows.map((f) => ({ ...f.nursery, followStatus: f.status }));
}
