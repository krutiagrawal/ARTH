import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';

interface BrowseFilter {
  q?: string;
  city?: string;
  page?: number;
  take?: number;
}

export async function browseNurseries(prisma: PrismaClient, filter: BrowseFilter = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    status: 'approved' as const,
    ...(filter.q ? { nurseryName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    ...(filter.city ? { city: { contains: filter.city, mode: 'insensitive' as const } } : {}),
  };

  const [nurseries, total] = await Promise.all([
    prisma.nurseryProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: { id: true, nurseryName: true, description: true, logoUrl: true, city: true, lat: true, lng: true },
    }),
    prisma.nurseryProfile.count({ where }),
  ]);

  return { total, nurseries };
}

export async function getPublicNurseryProfile(prisma: PrismaClient, nurseryId: string) {
  const nursery = await prisma.nurseryProfile.findFirst({ where: { id: nurseryId, status: 'approved' } });
  if (!nursery) throw new NotFoundError('Nursery not found');

  const stock = await prisma.saplingStock.findMany({
    where: { nurseryId: nursery.id, quantity: { gt: 0 } },
    orderBy: { species: 'asc' },
  });

  return {
    id: nursery.id,
    nurseryName: nursery.nurseryName,
    description: nursery.description,
    logoUrl: nursery.logoUrl,
    city: nursery.city,
    contactPhone: nursery.contactPhone,
    lat: nursery.lat,
    lng: nursery.lng,
    stock,
  };
}
