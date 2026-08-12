import { apiFetch } from './client';

export interface StreakWeek {
  week: string;
  days: boolean[];
}

export async function fetchStreakCalendar(weeks = 4): Promise<StreakWeek[]> {
  return apiFetch<StreakWeek[]>(`/api/streaks/calendar?weeks=${weeks}`);
}

export async function protectStreak(method: 'plant' | 'freeze' | 'xp') {
  return apiFetch('/api/streaks/protect', { method: 'POST', body: { method } });
}
