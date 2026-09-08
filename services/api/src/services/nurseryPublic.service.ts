import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { serializePost, viewerInclude } from './post.service';
import { haversineDistanceKm } from '../utils/geo';

interface BrowseFilter {
  q?: string;
  city?: string;
  deliveryOnly?: boolean;
  minRating?: number;
  page?: number;
  take?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

const NURSERY_SUMMARY_SELECT = {
  id: true,
  nurseryName: true,
  description: true,
  logoUrl: true,
  city: true,
  lat: true,
  lng: true,
  avgRating: true,
  reviewCount: true,
  offersDelivery: true,
} as const;

export async function browseNurseries(prisma: PrismaClient, filter: BrowseFilter = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    status: 'approved' as const,
    ...(filter.q ? { nurseryName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    ...(filter.city ? { city: { contains: filter.city, mode: 'insensitive' as const } } : {}),
    ...(filter.deliveryOnly ? { offersDelivery: true } : {}),
    ...(filter.minRating !== undefined ? { avgRating: { gte: filter.minRating } } : {}),
  };

  // Distance sort needs the full candidate set in memory before paginating — DB-level
  // skip/take can't express "sort by a computed haversine distance," same tension
  // listDrives() already solved for drives, mirrored here.
  if (filter.lat !== undefined && filter.lng !== undefined) {
    const candidates = await prisma.nurseryProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: NURSERY_SUMMARY_SELECT,
    });

    let withDistance = candidates.map((n) => ({
      ...n,
      distanceKm:
        n.lat !== null && n.lng !== null
          ? haversineDistanceKm({ lat: filter.lat!, lng: filter.lng! }, { lat: Number(n.lat), lng: Number(n.lng) })
          : undefined,
    }));

    if (filter.radiusKm !== undefined) {
      withDistance = withDistance.filter((n) => (n.distanceKm ?? Infinity) <= filter.radiusKm!);
    }
    withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    const total = withDistance.length;
    const nurseries = withDistance.slice((page - 1) * take, page * take);
    return { total, nurseries };
  }

  const [nurseries, total] = await Promise.all([
    prisma.nurseryProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: NURSERY_SUMMARY_SELECT,
    }),
    prisma.nurseryProfile.count({ where }),
  ]);

  return { total, nurseries };
}

export async function getPublicNurseryProfile(prisma: PrismaClient, nurseryId: string, viewerUserId?: string) {
  const nursery = await prisma.nurseryProfile.findFirst({ where: { id: nurseryId, status: 'approved' } });
  if (!nursery) throw new NotFoundError('Nursery not found');
  return assembleNurseryProfile(prisma, nursery, viewerUserId);
}

// Same assembly as getPublicNurseryProfile but for a pre-fetched profile row
// that hasn't been gated on status — admin needs to view pending/suspended nurseries too.
export async function getAdminNurseryProfile(prisma: PrismaClient, nurseryId: string) {
  const nursery = await prisma.nurseryProfile.findUnique({ where: { id: nurseryId } });
  if (!nursery) throw new NotFoundError('Nursery not found');
  return assembleNurseryProfile(prisma, nursery);
}

async function assembleNurseryProfile(prisma: PrismaClient, nursery: { id: string } & Record<string, any>, viewerUserId?: string) {
  const [stock, followersCount, follow, recentPosts] = await Promise.all([
    prisma.saplingStock.findMany({ where: { nurseryId: nursery.id, quantity: { gt: 0 } }, orderBy: { species: 'asc' } }),
    prisma.follow.count({ where: { nurseryId: nursery.id, status: 'accepted' } }),
    viewerUserId
      ? prisma.follow.findUnique({
          where: { followerId_nurseryId: { followerId: viewerUserId, nurseryId: nursery.id } },
          select: { status: true },
        })
      : Promise.resolve(null),
    prisma.post.findMany({
      where: { nurseryId: nursery.id, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: viewerInclude(viewerUserId),
    }),
  ]);

  return {
    id: nursery.id,
    nurseryName: nursery.nurseryName,
    description: nursery.description,
    logoUrl: nursery.logoUrl,
    coverPhotoUrl: nursery.coverPhotoUrl,
    city: nursery.city,
    contactPhone: nursery.contactPhone,
    lat: nursery.lat,
    lng: nursery.lng,
    avgRating: nursery.avgRating,
    reviewCount: nursery.reviewCount,
    offersDelivery: nursery.offersDelivery,
    deliveryRadiusKm: nursery.deliveryRadiusKm,
    followPolicy: nursery.followPolicy,
    followersCount,
    isFollowing: follow?.status === 'accepted',
    followStatus: follow?.status ?? null,
    recentPosts: recentPosts.map((p) => serializePost(p as any, viewerUserId)),
    stock,
  };
}
