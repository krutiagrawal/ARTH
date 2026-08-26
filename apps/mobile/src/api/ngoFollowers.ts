import { apiFetch } from './client';

export type FollowStatus = 'pending' | 'accepted';
export type FollowPolicy = 'open' | 'approval';

export interface ApiFollower {
  followId: string;
  status: FollowStatus;
  followedAt: string;
  respondedAt: string | null;
  user: {
    id: string;
    name: string;
    handle: string;
    avatarEmoji: string;
    treesPlantedCount: number;
  };
}

export interface ApiFollowersPage {
  total: number;
  /** Always the full pending count, regardless of the `status` filter — drives the tab badge. */
  pendingCount: number;
  followPolicy: FollowPolicy;
  followers: ApiFollower[];
}

export async function fetchFollowers(params: {
  status?: FollowStatus;
  q?: string;
  page?: number;
  take?: number;
} = {}): Promise<ApiFollowersPage> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.take) qs.set('take', String(params.take));
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<ApiFollowersPage>(`/api/ngo/followers${suffix}`);
}

export async function acceptFollowRequest(followId: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/followers/${followId}/accept`, { method: 'POST' });
}

export async function declineFollowRequest(followId: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/followers/${followId}/decline`, { method: 'POST' });
}

export async function removeFollower(followId: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/followers/${followId}`, { method: 'DELETE' });
}
