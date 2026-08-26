import { apiFetch } from './client';

export interface NgoStreakWeek {
  weekLabel: string;
  posted: boolean;
}

export async function fetchNgoStreakCalendar(weeks = 12): Promise<{ weeks: NgoStreakWeek[] }> {
  return apiFetch<{ weeks: NgoStreakWeek[] }>(`/api/ngo/streaks/calendar?weeks=${weeks}`);
}
