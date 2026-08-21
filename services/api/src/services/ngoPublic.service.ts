import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { computeSurvivalStats } from './plantedTree.service';

interface BrowseFilter {
  q?: string;
  city?: string;
  page?: number;
  take?: number;
}

export async function browseNgos(prisma: PrismaClient, filter: BrowseFilter = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    status: 'approved' as const,
    ...(filter.q ? { orgName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    ...(filter.city ? { city: { contains: filter.city, mode: 'insensitive' as const } } : {}),
  };

  const [ngos, total] = await Promise.all([
    prisma.ngoProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: { id: true, orgName: true, description: true, logoUrl: true, city: true },
    }),
    prisma.ngoProfile.count({ where }),
  ]);

  return { total, ngos };
}

export async function getPublicProfile(prisma: PrismaClient, ngoId: string, viewerUserId?: string) {
  const ngo = await prisma.ngoProfile.findFirst({ where: { id: ngoId, status: 'approved' } });
  if (!ngo) throw new NotFoundError('NGO not found');

  const [followersCount, isFollowing, featuredDrives, recentUpdates, impact] = await Promise.all([
    prisma.follow.count({ where: { ngoId: ngo.id } }),
    viewerUserId
      ? prisma.follow.findUnique({ where: { followerId_ngoId: { followerId: viewerUserId, ngoId: ngo.id } } }).then(Boolean)
      : Promise.resolve(false),
    prisma.drive.findMany({
      where: { ngoId: ngo.id, status: 'completed' },
      orderBy: [{ featured: 'desc' }, { startsAt: 'desc' }],
      take: 12,
      select: { id: true, title: true, photoUrl: true, city: true, startsAt: true, featured: true },
    }),
    prisma.ngoUpdate.findMany({
      where: { ngoId: ngo.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { drive: { select: { id: true, title: true } } },
    }),
    computeSurvivalStats(prisma, ngo.id),
  ]);

  return {
    id: ngo.id,
    orgName: ngo.orgName,
    description: ngo.description,
    website: ngo.website,
    logoUrl: ngo.logoUrl,
    city: ngo.city,
    foundedYear: ngo.foundedYear,
    volunteerCountEstimate: ngo.volunteerCountEstimate,
    awards: ngo.awards ?? [],
    followersCount,
    isFollowing,
    featuredDrives,
    recentUpdates,
    impact,
  };
}

export async function listPublicUpdatesForNgo(prisma: PrismaClient, ngoId: string, filter: { page?: number; take?: number } = {}) {
  const ngo = await prisma.ngoProfile.findFirst({ where: { id: ngoId, status: 'approved' } });
  if (!ngo) throw new NotFoundError('NGO not found');

  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.ngoUpdate.findMany({
    where: { ngoId: ngo.id },
    include: { drive: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
}
