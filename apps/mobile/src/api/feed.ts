import { apiFetch } from './client';

export type ActivityType =
  | 'tree_planted'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'friend_cheer'
  | 'challenge_joined'
  | 'challenge_completed';

export interface ApiActivity {
  id: string;
  type: ActivityType;
  user: { id: string; name: string; handle: string; avatarEmoji: string };
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  cheerCount: number;
  cheeredByMe: boolean;
}

export async function fetchFeed(scope: 'friends' | 'global' = 'friends'): Promise<ApiActivity[]> {
  return apiFetch<ApiActivity[]>(`/api/feed?scope=${scope}`);
}

export async function cheerActivity(id: string) {
  return apiFetch(`/api/feed/${id}/cheer`, { method: 'POST' });
}
