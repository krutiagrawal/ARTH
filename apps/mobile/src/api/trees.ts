import { apiFetch, toFormFile } from './client';

export interface ApiTree {
  id: string;
  species: string;
  speciesId: string;
  speciesEmoji: string;
  nickname: string;
  plantedAt: string;
  location: string | null;
  lat: number;
  lng: number;
  growthStage: 1 | 2 | 3 | 4 | 5;
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
  /** Set when this planting fulfils a specific scanned sapling unit (see ScanSaplingScreen) —
   * ties the planted tree back to the nursery-issued unit for traceability. */
  sourceUnitId?: string;
}

export async function plantTree(input: PlantTreeInput): Promise<ApiTree> {
  const form = new FormData();
  form.append('speciesId', input.speciesId);
  form.append('nickname', input.nickname);
  form.append('lat', String(input.lat));
  form.append('lng', String(input.lng));
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  if (input.caption?.trim()) form.append('caption', input.caption.trim());
  if (input.accuracy !== undefined) form.append('accuracy', String(input.accuracy));
  if (input.mocked !== undefined) form.append('mocked', input.mocked ? 'true' : 'false');
  if (input.sourceUnitId) form.append('sourceUnitId', input.sourceUnitId);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiTree>('/api/trees', { method: 'POST', body: form, isForm: true });
}

export interface ApiSaplingUnitDetail {
  id: string;
  status: 'issued' | 'collected' | 'planted' | 'void';
  speciesId: string;
  speciesName: string;
  speciesEmoji: string;
  nurseryName: string;
  ageAtSupplyLabel: string | null;
  alreadyPlanted: boolean;
  readyToPlant: boolean;
}

/** Resolves a scanned sapling QR's unitId (see components/common/SaplingQrCode.tsx and
 * screens/ScanSaplingScreen.tsx) to the unit's current state. */
export async function fetchSaplingUnit(unitId: string): Promise<ApiSaplingUnitDetail> {
  return apiFetch<ApiSaplingUnitDetail>(`/api/trees/sapling/${unitId}`);
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
