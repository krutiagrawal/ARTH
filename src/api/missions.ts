import { apiFetch } from './client';

export interface ApiDailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  icon: string;
  type: 'plant' | 'share' | 'learn' | 'community';
}

export async function fetchTodayMissions(): Promise<ApiDailyMission[]> {
  return apiFetch<ApiDailyMission[]>('/api/missions/today');
}

export async function completeMission(id: string) {
  return apiFetch(`/api/missions/${id}/complete`, { method: 'POST' });
}
