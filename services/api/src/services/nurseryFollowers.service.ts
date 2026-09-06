import { FollowStatus, Prisma, PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { getOwnProfile } from './nursery.service';
import { notify } from './notification.service';

function serializeFollower(f: any) {
  return {
    followId: f.id,
    status: f.status,
    followedAt: f.createdAt,
    respondedAt: f.respondedAt,
    user: {
      id: f.follower.id,
      name: f.follower.name,
      handle: f.follower.handle,
      avatarEmoji: f.follower.avatarEmoji,
      treesPlantedCount: f.follower.treesPlantedCount,
    },
  };
}

/** Nursery sibling of ngoFollowers.service.ts's listFollowers. */
export async function listFollowers(
  prisma: PrismaClient,
  nurseryUserId: string,
  filter: { status?: FollowStatus; q?: string; page?: number; take?: number } = {},
) {
  const nursery = await getOwnProfile(prisma, nurseryUserId);
  const take = Math.min(filter.take ?? 30, 100);
  const page = Math.max(filter.page ?? 1, 1);

  const where: Prisma.FollowWhereInput = {
    nurseryId: nursery.id,
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q
      ? {
          follower: {
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { handle: { contains: filter.q, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  };

  const [rows, total, pendingCount] = await Promise.all([
    prisma.follow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: {
        follower: { select: { id: true, name: true, handle: true, avatarEmoji: true, treesPlantedCount: true } },
      },
    }),
    prisma.follow.count({ where }),
    prisma.follow.count({ where: { nurseryId: nursery.id, status: 'pending' } }),
  ]);

  return {
    total,
    pendingCount,
    followPolicy: nursery.followPolicy,
    followers: rows.map(serializeFollower),
  };
}

async function requireOwnFollow(prisma: PrismaClient, nurseryUserId: string, followId: string) {
  const nursery = await getOwnProfile(prisma, nurseryUserId);
  const follow = await prisma.follow.findFirst({ where: { id: followId, nurseryId: nursery.id } });
  if (!follow) throw new NotFoundError('Follow request not found');
  return { nursery, follow };
}

export async function acceptFollowRequest(prisma: PrismaClient, nurseryUserId: string, followId: string) {
  const { nursery, follow } = await requireOwnFollow(prisma, nurseryUserId, followId);

  const updated = await prisma.follow.update({
    where: { id: follow.id },
    data: { status: 'accepted', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: follow.followerId,
    type: 'follow_accepted',
    actorNurseryId: nursery.id,
    followId: follow.id,
    push: { title: nursery.nurseryName, body: 'accepted your follow request' },
  });

  return updated;
}

export async function declineFollowRequest(prisma: PrismaClient, nurseryUserId: string, followId: string) {
  const { follow } = await requireOwnFollow(prisma, nurseryUserId, followId);
  await prisma.follow.delete({ where: { id: follow.id } });
}

export async function removeFollower(prisma: PrismaClient, nurseryUserId: string, followId: string) {
  const { follow } = await requireOwnFollow(prisma, nurseryUserId, followId);
  await prisma.follow.delete({ where: { id: follow.id } });
}
