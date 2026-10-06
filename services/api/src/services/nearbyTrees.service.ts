import { PrismaClient } from '@arth/db';
import { haversineDistanceKm, LatLng } from '../utils/geo';
import { getLatestStatusByTree } from './plantedTree.service';

const METERS_PER_DEGREE_LAT = 111_320;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface NearbyTreeDTO {
  id: string;
  kind: 'tree' | 'planted-tree';
  publicId: string;
  species: string;
  speciesEmoji: string | null;
  photoUrl: string | null;
  healthStatus: string;
  distanceM: number;
  lat: number;
  lng: number;
}

// Broad-radius discovery (500m-1km) — the "I am physically looking for this tree" entry point.
// Returns exact coordinates and distance so the app can guide the user to the tree. Sending an
// update is still gated separately (see plantingLocation.service.ts's assertCloseEnoughToObserve),
// which re-checks the true coordinates server-side at submission time.
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
    results.push({
      id: tree.id,
      kind: 'tree',
      publicId: tree.publicId,
      species: tree.species.commonName,
      speciesEmoji: tree.species.emoji,
      photoUrl: tree.photoUrl,
      healthStatus: tree.healthStatus,
      distanceM: Math.round(trueDistanceM),
      lat: trueCoords.lat,
      lng: trueCoords.lng,
      _trueDistanceM: trueDistanceM,
    });
  }

  for (const tree of plantedTrees) {
    if (tree.lat === null || tree.lng === null) continue;
    const trueCoords = { lat: Number(tree.lat), lng: Number(tree.lng) };
    const trueDistanceM = haversineDistanceKm(point, trueCoords) * 1000;
    if (trueDistanceM > radiusMeters) continue;
    results.push({
      id: tree.id,
      kind: 'planted-tree',
      publicId: tree.publicId,
      species: tree.speciesName,
      speciesEmoji: null,
      photoUrl: tree.photoUrl,
      healthStatus: plantedStatusByTree.get(tree.id) ?? 'not_checked',
      distanceM: Math.round(trueDistanceM),
      lat: trueCoords.lat,
      lng: trueCoords.lng,
      _trueDistanceM: trueDistanceM,
    });
  }

  return results
    .sort((a, b) => a._trueDistanceM - b._trueDistanceM)
    .map(({ _trueDistanceM, ...dto }) => dto);
}
