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
