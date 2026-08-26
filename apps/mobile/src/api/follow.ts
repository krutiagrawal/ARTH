import { apiFetch } from './client';
import type { ApiPost } from './posts';
import type { FollowStatus } from './ngoFollowers';

export interface ApiFollowedNgo {
  id: string;
  orgName: string;
  logoUrl: string | null;
  city: string | null;
  /** 'pending' while an approval-gated NGO has yet to accept — render "Requested". */
  followStatus: FollowStatus;
}

export interface FollowResult {
  /** Null after an unfollow. */
  status: FollowStatus | null;
  followersCount: number;
}

export async function followNgo(ngoId: string): Promise<FollowResult> {
  return apiFetch<FollowResult>(`/api/ngos/${ngoId}/follow`, { method: 'POST' });
}

export async function unfollowNgo(ngoId: string): Promise<FollowResult> {
  return apiFetch<FollowResult>(`/api/ngos/${ngoId}/follow`, { method: 'DELETE' });
}

export async function fetchFollowedNgos(): Promise<ApiFollowedNgo[]> {
  return apiFetch<ApiFollowedNgo[]>('/api/follows');
}

/**
 * Legacy endpoint. The feed screen uses `fetchSocialFeed` from api/posts instead — that one is
 * cursor-paginated and includes friends' posts, not just followed NGOs.
 */
export async function fetchFollowingFeed(): Promise<{ total: number; updates: ApiPost[] }> {
  return apiFetch('/api/follows/feed');
}
