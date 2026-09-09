import { apiFetch } from './client';
import type { ApiAchievement } from './achievements';

export type { ApiAchievement };

export async function fetchNgoAchievements(): Promise<ApiAchievement[]> {
  return apiFetch<ApiAchievement[]>('/api/ngo/achievements');
}

export async function fetchNgoPublicAchievements(ngoId: string): Promise<ApiAchievement[]> {
  return apiFetch<ApiAchievement[]>(`/api/ngos/${ngoId}/achievements`);
}
