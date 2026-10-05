import { apiFetch, toFormFile } from './client';
import type { TreeHealthStatus } from './plantedTrees';

export interface ApiTree {
  id: string;
  publicId: string;
  species: string;
  speciesId: string;
  speciesEmoji: string;
  nickname: string;
  plantedAt: string;
  location: string | null;
  lat: number;
  lng: number;
  growthStage: 1 | 2 | 3 | 4 | 5;
  healthStatus: TreeHealthStatus;
  photoUri: string | null;
  co2Absorbed: number;
  xpEarned: number;
}

export async function fetchTrees(params: { limit?: number } = {}): Promise<ApiTree[]> {
  const query = params.limit ? `?limit=${params.limit}` : '';
  return apiFetch<ApiTree[]>(`/api/trees${query}`);
}

/** Backs the map's tree layer. `scope: 'global'` + `nurseryId` is how NurseryImpactScreen's
 * "View on map" scopes the map down to just that nursery's sourced trees. */
export async function fetchTreesMap(params: { scope?: 'mine' | 'global'; nurseryId?: string } = {}): Promise<ApiTree[]> {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.nurseryId) query.set('nurseryId', params.nurseryId);
  const qs = query.toString();
  return apiFetch<ApiTree[]>(`/api/trees/map${qs ? `?${qs}` : ''}`);
}

export interface PlantTreeInput {
  speciesId: string;
  nickname: string;
  lat: number;
  lng: number;
  locationLabel?: string;
  caption?: string;
  accuracy?: number;
  mocked?: boolean;
  photo?: { uri: string; name: string; type: string };
}

export async function plantTree(input: PlantTreeInput): Promise<ApiTree> {
  const form = new FormData();
  form.append('speciesId', input.speciesId);
  form.append('nickname', input.nickname);
  form.append('lat', String(input.lat));
  form.append('lng', String(input.lng));
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  if (input.caption?.trim()) form.append('caption', input.caption.trim());
  // Both required server-side now (see trees.schema.ts) — always send them. A device that can't
  // report accuracy sends a deliberately bad value instead of omitting the field, so the request
  // fails with a clear "move to an open area" error rather than a generic invalid-input one.
  form.append('accuracy', String(input.accuracy ?? 9999));
  form.append('mocked', input.mocked ? 'true' : 'false');
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiTree>('/api/trees', { method: 'POST', body: form, isForm: true });
}

interface PassportPerson {
  id: string;
  name: string;
  handle: string;
  avatarEmoji?: string;
}

interface PassportSourceUnit {
  id: string;
  speciesNameSnapshot: string;
  ageAtSupplyLabel: string | null;
  supplyDate: string;
  nurseryId: string;
}

export interface PassportTimelineEntry {
  id: string;
  source: 'planted' | 'verified' | 'health_check' | 'observation';
  status: TreeHealthStatus | string | null;
  note: string | null;
  photoUrl: string | null;
  at: string;
  observerRole?: 'owner' | 'ngo' | 'community';
  observer?: { id: string; name: string; handle: string } | null;
}

export interface IndividualTreePassport {
  kind: 'individual';
  id: string;
  publicId: string;
  nickname: string;
  species: { id: string; commonName: string; emoji: string };
  plantedAt: string;
  locationLabel: string | null;
  lat: number;
  lng: number;
  photoUrl: string | null;
  co2Absorbed: number;
  xpEarned: number;
  aiVerificationStatus: 'unverified' | 'verified' | 'rejected';
  healthStatus: TreeHealthStatus;
  owner: PassportPerson;
  nursery: { id: string; nurseryName: string; logoUrl: string | null } | null;
  sourceUnit: PassportSourceUnit | null;
  timeline: PassportTimelineEntry[];
}

export interface NgoTreePassport {
  kind: 'ngo';
  id: string;
  publicId: string;
  speciesName: string;
  label: string | null;
  plantedAt: string;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  ngo: { id: string; orgName: string; logoUrl: string | null };
  drive: { id: string; title: string } | null;
  zone: { id: string; name: string } | null;
  sourceUnit: PassportSourceUnit | null;
  adopter: PassportPerson | null;
  healthStatus: TreeHealthStatus;
  timeline: PassportTimelineEntry[];
}

export type TreePassport = IndividualTreePassport | NgoTreePassport;

export async function fetchTreePassport(kind: 'tree' | 'planted-tree', id: string): Promise<TreePassport> {
  return apiFetch<TreePassport>(`/api/trees/passport/${kind}/${id}`);
}

export interface LogOwnObservationInput {
  status: Exclude<TreeHealthStatus, 'not_checked'>;
  note?: string;
  photo?: { uri: string; name: string; type: string };
}

export async function logOwnObservation(treeId: string, input: LogOwnObservationInput): Promise<unknown> {
  const form = new FormData();
  form.append('status', input.status);
  if (input.note?.trim()) form.append('note', input.note.trim());
  if (input.photo) form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  return apiFetch(`/api/trees/${treeId}/observations`, { method: 'POST', body: form, isForm: true });
}

export interface ApiNearbyTree {
  id: string;
  kind: 'tree' | 'planted-tree';
  publicId: string;
  species: string;
  speciesEmoji: string | null;
  photoUrl: string | null;
  healthStatus: TreeHealthStatus;
  approxDistanceM: number;
  lat: number;
  lng: number;
}

export async function fetchNearbyTrees(params: { lat: number; lng: number; radius?: number }): Promise<ApiNearbyTree[]> {
  const query = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
  if (params.radius) query.set('radius', String(params.radius));
  return apiFetch<ApiNearbyTree[]>(`/api/trees/nearby?${query.toString()}`);
}

export interface VerifyPlantingPhotoResult {
  isPlanting: boolean;
  reason: string;
}

export async function verifyPlantingPhoto(photo: { uri: string; name: string; type: string }): Promise<VerifyPlantingPhotoResult> {
  const form = new FormData();
  form.append('photo', toFormFile(photo.uri), photo.name);

  return apiFetch<VerifyPlantingPhotoResult>('/api/trees/verify-photo', { method: 'POST', body: form, isForm: true });
}
