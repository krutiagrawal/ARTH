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
  hasMore: boolean;
}

export async function fetchLeaderboard(
  scope: 'global' | 'friends' = 'global',
  opts: { limit?: number; offset?: number } = {},
): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams({ scope });
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.offset) qs.set('offset', String(opts.offset));
  return apiFetch<LeaderboardResponse>(`/api/leaderboard?${qs}`);
}
