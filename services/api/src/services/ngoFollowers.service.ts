import { FollowStatus, Prisma, PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { requireNgoProfile } from './ngo.service';
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

/**
 * The NGO-side followers list, split by status so one endpoint serves both the "Followers" tab
 * and the "Requests" inbox.
 *
 * Uses `requireNgoProfile` rather than the approved-only variant: a suspended or pending NGO can
 * still read its own history, matching how the rest of the NGO read paths behave.
 */
export async function listFollowers(
  prisma: PrismaClient,
  ngoUserId: string,
  filter: { status?: FollowStatus; q?: string; page?: number; take?: number } = {},
) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 30, 100);
  const page = Math.max(filter.page ?? 1, 1);

  const where: Prisma.FollowWhereInput = {
    ngoId: ngo.id,
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
        follower: {
          select: { id: true, name: true, handle: true, avatarEmoji: true, treesPlantedCount: true },
        },
      },
    }),
    prisma.follow.count({ where }),
    prisma.follow.count({ where: { ngoId: ngo.id, status: 'pending' } }),
  ]);

  return {
    total,
    pendingCount,
    followPolicy: ngo.followPolicy,
    followers: rows.map(serializeFollower),
  };
}

async function requireOwnFollow(prisma: PrismaClient, ngoUserId: string, followId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const follow = await prisma.follow.findFirst({ where: { id: followId, ngoId: ngo.id } });
  if (!follow) throw new NotFoundError('Follow request not found');
  return { ngo, follow };
}

export async function acceptFollowRequest(prisma: PrismaClient, ngoUserId: string, followId: string) {
  const { ngo, follow } = await requireOwnFollow(prisma, ngoUserId, followId);

  const updated = await prisma.follow.update({
    where: { id: follow.id },
    data: { status: 'accepted', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: follow.followerId,
    type: 'follow_accepted',
    actorNgoId: ngo.id,
    followId: follow.id,
    push: { title: ngo.orgName, body: 'accepted your follow request' },
  });

  return updated;
}

/** Declining removes the row outright, so the person can ask again later. */
export async function declineFollowRequest(prisma: PrismaClient, ngoUserId: string, followId: string) {
  const { follow } = await requireOwnFollow(prisma, ngoUserId, followId);
  await prisma.follow.delete({ where: { id: follow.id } });
}

/** Removing an accepted follower. Silent by design — no notification is sent. */
export async function removeFollower(prisma: PrismaClient, ngoUserId: string, followId: string) {
  const { follow } = await requireOwnFollow(prisma, ngoUserId, followId);
  await prisma.follow.delete({ where: { id: follow.id } });
}
