import { apiFetch } from './client';

export interface NgoStreakWeek {
  weekLabel: string;
  posted: boolean;
}

export interface NgoStreakCalendar {
  weeks: NgoStreakWeek[];
  /** Server-computed, uncapped by `weeks`. */
  current: number;
  longest: number;
}

export async function fetchNgoStreakCalendar(weeks = 12): Promise<NgoStreakCalendar> {
  return apiFetch<NgoStreakCalendar>(`/api/ngo/streaks/calendar?weeks=${weeks}`);
}
