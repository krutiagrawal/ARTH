import { createHash } from 'node:crypto';
import { PrismaClient } from '@arth/db';
import { haversineDistanceKm, LatLng } from '../utils/geo';
import { getLatestStatusByTree } from './plantedTree.service';

const METERS_PER_DEGREE_LAT = 111_320;
const JITTER_MIN_METERS = 30;
const JITTER_MAX_METERS = 80;
const DISTANCE_ROUNDING_METERS = 50;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Deterministic per-tree pseudo-random angle/magnitude, derived from a hash of the tree's own
// id — repeated queries return the SAME jittered position (not one that jumps every request),
// while still never revealing the true coordinate. 30-80m offset, well outside the 15m strict
// observation radius, so jittering alone can never be close enough to pass that gate.
function seededJitter(id: string): { angle: number; magnitudeM: number } {
  const hash = createHash('sha256').update(id).digest();
  const angle = (hash.readUInt32BE(0) / 0xffffffff) * 2 * Math.PI;
  const magnitudeM = JITTER_MIN_METERS + (hash.readUInt32BE(4) / 0xffffffff) * (JITTER_MAX_METERS - JITTER_MIN_METERS);
  return { angle, magnitudeM };
}

function jitterCoords(point: LatLng, id: string): LatLng {
  const { angle, magnitudeM } = seededJitter(id);
  const dLat = (magnitudeM * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
  const dLng = (magnitudeM * Math.sin(angle)) / (METERS_PER_DEGREE_LAT * Math.cos(toRad(point.lat)));
  return { lat: point.lat + dLat, lng: point.lng + dLng };
}

// Rounded AND fuzzed — exact distance would let a motivated requester triangulate a true
// position from three or more queries at different vantage points.
function fuzzedDistanceM(trueDistanceM: number): number {
  return Math.max(DISTANCE_ROUNDING_METERS, Math.round(trueDistanceM / DISTANCE_ROUNDING_METERS) * DISTANCE_ROUNDING_METERS);
}

export interface NearbyTreeDTO {
  id: string;
  kind: 'tree' | 'planted-tree';
  publicId: string;
  species: string;
  speciesEmoji: string | null;
  photoUrl: string | null;
  healthStatus: string;
  approxDistanceM: number;
  lat: number;
  lng: number;
}

// Broad-radius discovery (500m-1km) — the "I am physically looking for this tree" entry point.
// Returned coordinates are jittered; this is deliberately NOT the same gate as observation
// eligibility (see plantingLocation.service.ts's assertCloseEnoughToObserve), which re-checks
// the TRUE coordinates server-side at submission time regardless of what this endpoint returned.
export async function findNearbyTrees(prisma: PrismaClient, point: LatLng, radiusMeters: number): Promise<NearbyTreeDTO[]> {
  const latDelta = radiusMeters / METERS_PER_DEGREE_LAT;
  const lngDelta = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos(toRad(point.lat)));

  const [trees, plantedTrees] = await Promise.all([
    prisma.tree.findMany({
      where: {
        isDeleted: false,
        lat: { gte: point.lat - latDelta, lte: point.lat + latDelta },
        lng: { gte: point.lng - lngDelta, lte: point.lng + lngDelta },
      },
      select: { id: true, publicId: true, lat: true, lng: true, photoUrl: true, healthStatus: true, species: { select: { commonName: true, emoji: true } } },
      take: 500,
    }),
    prisma.plantedTree.findMany({
      where: {
        lat: { gte: point.lat - latDelta, lte: point.lat + latDelta },
        lng: { gte: point.lng - lngDelta, lte: point.lng + lngDelta },
      },
      select: { id: true, publicId: true, lat: true, lng: true, photoUrl: true, speciesName: true },
      take: 500,
    }),
  ]);

  const plantedStatusByTree = await getLatestStatusByTree(prisma, plantedTrees.map((t) => t.id));

  const results: (NearbyTreeDTO & { _trueDistanceM: number })[] = [];

  for (const tree of trees) {
    const trueCoords = { lat: Number(tree.lat), lng: Number(tree.lng) };
    const trueDistanceM = haversineDistanceKm(point, trueCoords) * 1000;
    if (trueDistanceM > radiusMeters) continue;
    const jittered = jitterCoords(trueCoords, tree.id);
    results.push({
      id: tree.id,
      kind: 'tree',
      publicId: tree.publicId,
      species: tree.species.commonName,
      speciesEmoji: tree.species.emoji,
      photoUrl: tree.photoUrl,
      healthStatus: tree.healthStatus,
      approxDistanceM: fuzzedDistanceM(trueDistanceM),
      lat: jittered.lat,
      lng: jittered.lng,
      _trueDistanceM: trueDistanceM,
    });
  }

  for (const tree of plantedTrees) {
    if (tree.lat === null || tree.lng === null) continue;
    const trueCoords = { lat: Number(tree.lat), lng: Number(tree.lng) };
    const trueDistanceM = haversineDistanceKm(point, trueCoords) * 1000;
    if (trueDistanceM > radiusMeters) continue;
    const jittered = jitterCoords(trueCoords, tree.id);
    results.push({
      id: tree.id,
      kind: 'planted-tree',
      publicId: tree.publicId,
      species: tree.speciesName,
      speciesEmoji: null,
      photoUrl: tree.photoUrl,
      healthStatus: plantedStatusByTree.get(tree.id) ?? 'not_checked',
      approxDistanceM: fuzzedDistanceM(trueDistanceM),
      lat: jittered.lat,
      lng: jittered.lng,
      _trueDistanceM: trueDistanceM,
    });
  }

  return results
    .sort((a, b) => a._trueDistanceM - b._trueDistanceM)
    .map(({ _trueDistanceM, ...dto }) => dto);
}
