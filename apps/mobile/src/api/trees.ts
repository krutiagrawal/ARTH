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

export interface PlantTreeInput {
  speciesId: string;
  nickname: string;
  lat: number;
  lng: number;
  locationLabel?: string;
  photo?: { uri: string; name: string; type: string };
}

export async function plantTree(input: PlantTreeInput): Promise<ApiTree> {
  const form = new FormData();
  form.append('speciesId', input.speciesId);
  form.append('nickname', input.nickname);
  form.append('lat', String(input.lat));
  form.append('lng', String(input.lng));
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiTree>('/api/trees', { method: 'POST', body: form, isForm: true });
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
