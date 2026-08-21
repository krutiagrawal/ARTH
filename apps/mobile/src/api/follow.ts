import { apiFetch } from './client';
import type { ApiNgoUpdate } from './ngoUpdates';

export interface ApiFollowedNgo {
  id: string;
  orgName: string;
  logoUrl: string | null;
  city: string | null;
}

export async function followNgo(ngoId: string): Promise<void> {
  await apiFetch<void>(`/api/ngos/${ngoId}/follow`, { method: 'POST' });
}

export async function unfollowNgo(ngoId: string): Promise<void> {
  await apiFetch<void>(`/api/ngos/${ngoId}/follow`, { method: 'DELETE' });
}

export async function fetchFollowedNgos(): Promise<ApiFollowedNgo[]> {
  return apiFetch<ApiFollowedNgo[]>('/api/follows');
}

export async function fetchFollowingFeed(): Promise<{ total: number; updates: ApiNgoUpdate[] }> {
  return apiFetch('/api/follows/feed');
}
