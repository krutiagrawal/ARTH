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

/** Reports a completed share to the "Share Your Forest" quest – the only quest the server can't see happen. */
export async function reportShareMission() {
  return apiFetch('/api/missions/share', { method: 'POST' });
}
