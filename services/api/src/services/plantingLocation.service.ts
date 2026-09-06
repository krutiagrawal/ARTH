import { PrismaClient } from '@plant/db';
import { haversineDistanceKm, LatLng } from '../utils/geo';
import { ForbiddenError } from '../utils/errors';

export const NOT_APPROVED_MESSAGE =
  'This place is not approved for planting, check out ARTH approved places.';

export async function listApprovedLocations(prisma: PrismaClient) {
  return prisma.approvedPlantingLocation.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function findMatchingLocation(prisma: PrismaClient, point: LatLng) {
  const locations = await listApprovedLocations(prisma);

  for (const location of locations) {
    const distanceKm = haversineDistanceKm(point, { lat: Number(location.lat), lng: Number(location.lng) });
    if (distanceKm * 1000 <= location.radiusMeters) {
      return location;
    }
  }

  return null;
}

export async function assertEligiblePlantingLocation(prisma: PrismaClient, point: LatLng) {
  const match = await findMatchingLocation(prisma, point);
  if (!match) throw new ForbiddenError(NOT_APPROVED_MESSAGE);
  return match;
}
