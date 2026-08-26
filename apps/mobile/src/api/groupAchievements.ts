import { apiFetch } from './client';
import type { ApiAchievement } from './achievements';

export type { ApiAchievement };

// Owner-facing (role 'group').
export async function fetchGroupAchievements(): Promise<ApiAchievement[]> {
  return apiFetch<ApiAchievement[]>('/api/group/achievements');
}

// Member-facing (any authenticated user viewing a group they belong to).
export async function fetchGroupAchievementsForMember(groupId: string): Promise<ApiAchievement[]> {
  return apiFetch<ApiAchievement[]>(`/api/groups/${groupId}/achievements`);
}
