import { apiFetch } from './client';

export interface ApiFriend {
  id: string;
  friendshipId: string;
  name: string;
  handle: string;
  avatar: string;
  treesPlanted: number;
  streak: number;
  isOnline: boolean;
  lastActive: string | null;
  forestLevel: number;
}

export interface ApiFriendRequest {
  id: string;
  from: { id: string; name: string; handle: string; avatar: string };
  createdAt: string;
}

export interface ApiUserSearchResult {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  level: number;
}

export async function fetchFriends(): Promise<ApiFriend[]> {
  return apiFetch<ApiFriend[]>('/api/friends');
}

export async function fetchFriendRequests(): Promise<ApiFriendRequest[]> {
  return apiFetch<ApiFriendRequest[]>('/api/friends/requests');
}

export async function searchUsers(query: string): Promise<ApiUserSearchResult[]> {
  if (!query.trim()) return [];
  return apiFetch<ApiUserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
}

export async function sendFriendRequest(addresseeId: string) {
  return apiFetch('/api/friends/requests', { method: 'POST', body: { addresseeId } });
}

export async function respondFriendRequest(id: string, action: 'accept' | 'decline') {
  return apiFetch(`/api/friends/requests/${id}/${action}`, { method: 'POST' });
}

// Note: the backend resolves the friendship by the *other user's* id, not the friendship row id.
export async function removeFriend(friendUserId: string) {
  return apiFetch(`/api/friends/${friendUserId}`, { method: 'DELETE' });
}
