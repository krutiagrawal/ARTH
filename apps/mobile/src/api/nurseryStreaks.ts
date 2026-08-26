import { apiFetch } from './client';
import type { StreakWeek } from './streaks';

export type { StreakWeek };

export async function fetchNurseryStreakCalendar(weeks = 6): Promise<StreakWeek[]> {
  return apiFetch<StreakWeek[]>(`/api/nursery/streaks/calendar?weeks=${weeks}`);
}
