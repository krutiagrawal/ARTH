import { apiFetch } from './client';

export interface GlobalCounter {
  treesToday: number;
  plantersToday: number;
  dailyGoal: number;
  percentOfGoal: number;
}

export async function fetchGlobalCounter(): Promise<GlobalCounter> {
  return apiFetch<GlobalCounter>('/api/community/global-counter', { auth: false });
}
