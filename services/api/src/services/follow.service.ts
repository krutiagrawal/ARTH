import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

async function requireApprovedNgo(prisma: PrismaClient, ngoId: string) {
  const ngo = await prisma.ngoProfile.findFirst({ where: { id: ngoId, status: 'approved' } });
  if (!ngo) throw new NotFoundError('NGO not found');
  return ngo;
}

export async function followNgo(prisma: PrismaClient, userId: string, ngoId: string) {
  await requireApprovedNgo(prisma, ngoId);
  await prisma.follow.upsert({
    where: { followerId_ngoId: { followerId: userId, ngoId } },
    create: { followerId: userId, ngoId },
    update: {},
  });
}

export async function unfollowNgo(prisma: PrismaClient, userId: string, ngoId: string) {
  await prisma.follow.deleteMany({ where: { followerId: userId, ngoId } });
}

export async function listFollowedNgos(prisma: PrismaClient, userId: string) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { ngo: { select: { id: true, orgName: true, logoUrl: true, city: true } } },
  });
  return follows.map((f) => f.ngo);
}

export async function getFollowingFeed(prisma: PrismaClient, userId: string, filter: { page?: number; take?: number } = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const followedNgoIds = await prisma.follow.findMany({ where: { followerId: userId }, select: { ngoId: true } });
  const ngoIds = followedNgoIds.map((f) => f.ngoId);
  if (ngoIds.length === 0) return { total: 0, updates: [] };

  const [updates, total] = await Promise.all([
    prisma.ngoUpdate.findMany({
      where: { ngoId: { in: ngoIds } },
      include: {
        ngo: { select: { id: true, orgName: true, logoUrl: true } },
        drive: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.ngoUpdate.count({ where: { ngoId: { in: ngoIds } } }),
  ]);

  return { total, updates };
}
