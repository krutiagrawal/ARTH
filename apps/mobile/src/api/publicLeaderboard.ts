import { apiFetch } from './client';

export interface PublicNgoLeaderboardEntry {
  rank: number;
  id: string;
  orgName: string;
  logoUrl: string | null;
  treesPlanted: number;
}

export interface PublicNurseryLeaderboardEntry {
  rank: number;
  id: string;
  nurseryName: string;
  logoUrl: string | null;
  followers: number;
}

interface PublicLeaderboardPage<T> {
  entries: T[];
  total: number;
  hasMore: boolean;
}

/** Public, visible-to-anyone ranking — distinct from `fetchNgoLeaderboard`, which requires an NGO login and returns only "my rank". */
export async function fetchPublicNgoLeaderboard(limit = 20, offset = 0): Promise<PublicLeaderboardPage<PublicNgoLeaderboardEntry>> {
  return apiFetch(`/api/ngos/leaderboard?limit=${limit}&offset=${offset}`);
}

export async function fetchPublicNurseryLeaderboard(limit = 20, offset = 0): Promise<PublicLeaderboardPage<PublicNurseryLeaderboardEntry>> {
  return apiFetch(`/api/nurseries/leaderboard?limit=${limit}&offset=${offset}`);
}
