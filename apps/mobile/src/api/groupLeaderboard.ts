import { apiFetch } from './client';

export interface GroupLeaderboardEntry {
  rank: number;
  id: string;
  groupName: string;
  logoUrl: string | null;
  treesPlanted: number;
  isGroup: boolean;
}

export interface GroupLeaderboardResponse {
  entries: GroupLeaderboardEntry[];
  totalGroups: number;
  myRank: number | null;
}

export async function fetchGroupLeaderboard(limit = 50): Promise<GroupLeaderboardResponse> {
  return apiFetch<GroupLeaderboardResponse>(`/api/group/leaderboard?limit=${limit}`);
}
