import { PrismaClient } from '@arth/db';
import { haversineDistanceKm, LatLng } from '../utils/geo';
import { ForbiddenError } from '../utils/errors';
import { env } from '../config/env';

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
  if (!match && env.APPROVED_PLANTING_LOCATION_CHECK_ENABLED === 'false') return null;
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

export function assertGpsNotMocked(mocked: boolean) {
  if (mocked === true) throw new ForbiddenError(MOCKED_LOCATION_MESSAGE);
}

export function assertGpsAccuracy(accuracyMeters: number) {
  if (accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) {
    throw new ForbiddenError(WEAK_GPS_ACCURACY_MESSAGE);
  }
}

export async function assertNoNearbyOwnPlanting(prisma: PrismaClient, userId: string, point: LatLng) {
  if (env.DUPLICATE_PLANTING_CHECK_ENABLED === 'false') return;

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

// ---- Community tree-observation geofencing ----
// Deliberately separate constants from the planting ones above even though
// OBSERVATION_MAX_DISTANCE_METERS equals SAME_USER_MIN_DISTANCE_METERS today — different
// semantic meaning (can't be a duplicate planting vs. must be standing by this specific tree),
// so they're free to diverge later without the two concerns getting tangled.
const OBSERVATION_MAX_DISTANCE_METERS = 15;
const OBSERVATION_MAX_ACCURACY_METERS = 20;

export const TOO_FAR_TO_OBSERVE_MESSAGE =
  'You need to be standing within 15 meters of this tree to log an observation.';

export function assertObservationGpsAccuracy(accuracyMeters: number) {
  if (accuracyMeters > OBSERVATION_MAX_ACCURACY_METERS) {
    throw new ForbiddenError(WEAK_GPS_ACCURACY_MESSAGE);
  }
}

// Resolves distance server-side from the tree's TRUE stored coordinates (passed in by the
// caller, which already loaded the row) against the observer's submitted point — never the
// other way around, and the true coordinates are never sent to the client before this check
// passes. Returns the distance in meters so the caller can persist it for audit/abuse-review.
export function assertCloseEnoughToObserve(targetTrueCoords: LatLng, point: LatLng): number {
  const distanceM = haversineDistanceKm(point, targetTrueCoords) * 1000;
  if (distanceM > OBSERVATION_MAX_DISTANCE_METERS) {
    throw new ForbiddenError(TOO_FAR_TO_OBSERVE_MESSAGE);
  }
  return distanceM;
}
