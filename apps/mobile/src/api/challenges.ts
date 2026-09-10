import { apiFetch } from './client';

export interface ApiChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  total: number;
  participants: number;
  daysLeft: number;
}

export async function fetchChallenges(): Promise<ApiChallenge[]> {
  return apiFetch<ApiChallenge[]>('/api/challenges', { auth: false });
}

export async function joinChallenge(id: string) {
  return apiFetch(`/api/challenges/${id}/join`, { method: 'POST' });
}

export async function leaveChallenge(id: string) {
  return apiFetch(`/api/challenges/${id}/join`, { method: 'DELETE' });
}

export interface ApiChallengeFriend {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
}

export type ChallengeFriendsJoinedMap = Record<string, { count: number; friends: ApiChallengeFriend[] }>;

export async function fetchChallengeFriendsJoined(ids: string[]): Promise<ChallengeFriendsJoinedMap> {
  if (ids.length === 0) return {};
  return apiFetch<ChallengeFriendsJoinedMap>(`/api/challenges/friends-joined?ids=${ids.join(',')}`);
}
