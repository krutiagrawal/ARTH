import { apiFetch } from './client';
import type { FollowStatus, FollowPolicy, ApiFollower, ApiFollowersPage } from './ngoFollowers';

export type { FollowStatus, FollowPolicy, ApiFollower, ApiFollowersPage };

export async function fetchNurseryFollowers(params: {
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
  return apiFetch<ApiFollowersPage>(`/api/nursery/followers${suffix}`);
}

export async function acceptNurseryFollowRequest(followId: string): Promise<void> {
  await apiFetch<void>(`/api/nursery/followers/${followId}/accept`, { method: 'POST' });
}

export async function declineNurseryFollowRequest(followId: string): Promise<void> {
  await apiFetch<void>(`/api/nursery/followers/${followId}/decline`, { method: 'POST' });
}

export async function removeNurseryFollower(followId: string): Promise<void> {
  await apiFetch<void>(`/api/nursery/followers/${followId}`, { method: 'DELETE' });
}
