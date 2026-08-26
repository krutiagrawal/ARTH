import { apiFetch } from './client';

export interface NgoLeaderboardEntry {
  rank: number;
  id: string;
  orgName: string;
  logoUrl: string | null;
  treesPlanted: number;
  isNgo: boolean;
}

export interface NgoLeaderboardResponse {
  entries: NgoLeaderboardEntry[];
  totalNgos: number;
  myRank: number | null;
}

export async function fetchNgoLeaderboard(limit = 50): Promise<NgoLeaderboardResponse> {
  return apiFetch<NgoLeaderboardResponse>(`/api/ngo/leaderboard?limit=${limit}`);
}
