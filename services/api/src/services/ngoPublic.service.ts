import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { computeSurvivalStats } from './plantedTree.service';
import { serializePost, viewerInclude } from './post.service';
import { getPortfolioImpact, listPublicPortfolio } from './portfolio.service';

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

  const [followersCount, follow, featuredDrives, recentPosts, impact, staff, portfolio, portfolioImpact] =
    await Promise.all([
      // Pending requests are not followers yet, so they must not inflate the public count.
      prisma.follow.count({ where: { ngoId: ngo.id, status: 'accepted' } }),
      viewerUserId
        ? prisma.follow.findUnique({
            where: { followerId_ngoId: { followerId: viewerUserId, ngoId: ngo.id } },
            select: { status: true },
          })
        : Promise.resolve(null),
      prisma.drive.findMany({
        where: { ngoId: ngo.id, status: 'completed' },
        orderBy: [{ featured: 'desc' }, { startsAt: 'desc' }],
        take: 12,
        select: { id: true, title: true, photoUrl: true, city: true, startsAt: true, featured: true },
      }),
      prisma.post.findMany({
        where: { ngoId: ngo.id, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: viewerInclude(viewerUserId),
      }),
      computeSurvivalStats(prisma, ngo.id),
      prisma.staffMember.findMany({
        where: { ngoId: ngo.id },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, role: true, photoUrl: true },
      }),
      listPublicPortfolio(prisma, ngo.id),
      getPortfolioImpact(prisma, ngo.id),
    ]);

  const recentUpdates = recentPosts.map((p) => serializePost(p as any, viewerUserId));

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
    followPolicy: ngo.followPolicy,
    followersCount,
    isFollowing: follow?.status === 'accepted',
    // Distinct from isFollowing so the button can read "Requested" on an approval-gated NGO.
    followStatus: follow?.status ?? null,
    featuredDrives,
    recentUpdates,
    staff,
    portfolio,
    impact,
    // Self-reported historical totals, kept separate from `impact` (which is backed by
    // PlantedTree health checks) so the survival rate stays trustworthy.
    priorImpact: portfolioImpact,
  };
}

export async function listPublicUpdatesForNgo(prisma: PrismaClient, ngoId: string, filter: { page?: number; take?: number } = {}) {
  const ngo = await prisma.ngoProfile.findFirst({ where: { id: ngoId, status: 'approved' } });
  if (!ngo) throw new NotFoundError('NGO not found');

  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const posts = await prisma.post.findMany({
    where: { ngoId: ngo.id, isHidden: false },
    include: viewerInclude(),
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });

  return posts.map((p) => serializePost(p as any));
}
