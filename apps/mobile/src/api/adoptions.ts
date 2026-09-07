import { apiFetch, toFormFile } from './client';

export interface ApiAdoptableTree {
  id: string;
  ngoId: string;
  ngoName: string;
  nickname: string;
  speciesName: string;
  description: string;
  instructions: string | null;
  photoUri: string | null;
  location: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  status: 'available' | 'adopted' | 'removed';
  isAdopted: boolean;
  distanceKm?: number;
  adopter?: { name: string; handle: string; message: string | null; adoptedAt: string };
}

export async function fetchAdoptableTrees(params: { lat?: number; lng?: number } = {}): Promise<ApiAdoptableTree[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  const qs = query.toString();
  return apiFetch<ApiAdoptableTree[]>(`/api/adoptable-trees${qs ? `?${qs}` : ''}`);
}

export async function fetchAdoptableTree(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}`);
}

export async function adoptTree(id: string, message?: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/adopt`, {
    method: 'POST',
    body: message ? { message } : {},
  });
}

export async function fetchMyAdoptions(): Promise<ApiAdoptableTree[]> {
  return apiFetch<ApiAdoptableTree[]>('/api/adoptable-trees/my-adoptions');
}

export async function releaseMyAdoption(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/adopt`, { method: 'DELETE' });
}

// ---------- NGO-facing ----------

export async function fetchMyAdoptableTrees(): Promise<ApiAdoptableTree[]> {
  return apiFetch<ApiAdoptableTree[]>('/api/adoptable-trees/mine');
}

export interface CreateAdoptableTreeInput {
  nickname: string;
  speciesName: string;
  description: string;
  instructions?: string;
  locationLabel?: string;
  city: string;
  photo?: { uri: string; name: string; type: string };
}

export async function createAdoptableTree(input: CreateAdoptableTreeInput): Promise<ApiAdoptableTree> {
  const form = new FormData();
  form.append('nickname', input.nickname);
  form.append('speciesName', input.speciesName);
  form.append('description', input.description);
  if (input.instructions) form.append('instructions', input.instructions);
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  form.append('city', input.city);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiAdoptableTree>('/api/adoptable-trees', { method: 'POST', body: form, isForm: true });
}
