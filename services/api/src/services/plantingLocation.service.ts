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

export const MOCKED_LOCATION_MESSAGE =
  'Your device is reporting a mock/fake GPS location. Please disable mock locations and try again.';

export const WEAK_GPS_ACCURACY_MESSAGE =
  "We couldn't get a precise enough GPS fix. Please move to an open area with a clear sky view and try again.";

export const DUPLICATE_PLANTING_MESSAGE =
  "You've already logged a planting within 15 meters of this spot. Move to a new spot to plant here.";

const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
const SAME_USER_MIN_DISTANCE_METERS = 15;

export function assertGpsNotMocked(mocked: boolean | undefined) {
  if (mocked === true) throw new ForbiddenError(MOCKED_LOCATION_MESSAGE);
}

export function assertGpsAccuracy(accuracyMeters: number | undefined) {
  // Missing accuracy (some devices never report it) is treated as "unknown" and allowed
  // through — only an explicit numeric value worse than the threshold is rejected, so we
  // never false-positive a real user just because their phone omits the field.
  if (accuracyMeters !== undefined && accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) {
    throw new ForbiddenError(WEAK_GPS_ACCURACY_MESSAGE);
  }
}

export async function assertNoNearbyOwnPlanting(prisma: PrismaClient, userId: string, point: LatLng) {
  const priorTrees = await prisma.tree.findMany({
    where: {
      userId,
      isDeleted: false,
      // Excludes 'rejected' — a fake/rejected photo shouldn't reserve a real coordinate
      // against a later genuine attempt at the same spot.
      aiVerificationStatus: { in: ['verified', 'unverified'] },
    },
    select: { lat: true, lng: true },
  });
  for (const t of priorTrees) {
    const distanceKm = haversineDistanceKm(point, { lat: Number(t.lat), lng: Number(t.lng) });
    if (distanceKm * 1000 <= SAME_USER_MIN_DISTANCE_METERS) {
      throw new ForbiddenError(DUPLICATE_PLANTING_MESSAGE);
    }
  }
}
