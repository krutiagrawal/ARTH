import { apiFetch } from './client';

export interface ApiPublicFollower {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  treesPlantedCount: number;
}

export interface ApiPublicFollowersPage {
  total: number;
  followers: ApiPublicFollower[];
}

/** Read-only accepted-followers list, visible to any visitor — not the owner-only inbox. */
export async function fetchNgoPublicFollowers(ngoId: string, page = 1): Promise<ApiPublicFollowersPage> {
  return apiFetch<ApiPublicFollowersPage>(`/api/ngos/${ngoId}/followers?page=${page}&take=30`);
}

export async function fetchNurseryPublicFollowers(nurseryId: string, page = 1): Promise<ApiPublicFollowersPage> {
  return apiFetch<ApiPublicFollowersPage>(`/api/nurseries/${nurseryId}/followers?page=${page}&take=30`);
}
