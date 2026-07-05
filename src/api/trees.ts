import { apiFetch } from './client';

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
    form.append('photo', {
      uri: input.photo.uri,
      name: input.photo.name,
      type: input.photo.type,
    } as unknown as Blob);
  }

  return apiFetch<ApiTree>('/api/trees', { method: 'POST', body: form, isForm: true });
}

export function resolvePhotoUrl(photoUri: string | null, apiUrl: string): string | undefined {
  if (!photoUri) return undefined;
  return photoUri.startsWith('http') ? photoUri : `${apiUrl}${photoUri}`;
}
