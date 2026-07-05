import { apiFetch } from './client';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  handle: string;
  avatar: string;
  trees: number;
  streak: number;
  isUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalUsers: number;
  myRank: number | null;
}

export async function fetchLeaderboard(scope: 'global' | 'friends' = 'global'): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?scope=${scope}`);
}
