import { apiFetch } from './client';

export interface ApiAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  progress: number;
  total?: number;
}

export async function fetchAchievements(): Promise<ApiAchievement[]> {
  return apiFetch<ApiAchievement[]>('/api/achievements');
}
