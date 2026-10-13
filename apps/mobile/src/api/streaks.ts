import { apiFetch } from './client';

export interface StreakWeek {
  week: string;
  days: boolean[];
}

export async function fetchStreakCalendar(weeks = 4): Promise<StreakWeek[]> {
  return apiFetch<StreakWeek[]>(`/api/streaks/calendar?weeks=${weeks}`);
}

export type StreakState = 'safe' | 'at_risk' | 'broken';

export interface StreakStatus {
  state: StreakState;
  /** The real streak — 0 once a full day has been missed. */
  streakCurrent: number;
  /** One missed day (yesterday) can be bought back with a freeze or XP. */
  revivable: boolean;
  /** Length of the run before the missed day. */
  previousStreak: number;
  /** What the streak becomes if revived. */
  restoredStreak: number;
  reviveDate: string | null;
  streakMax: number;
  streakFreezesAvailable: number;
  xp: number;
  xpCost: number;
  /** Days saved or revived with a freeze, all time. */
  freezesUsed: number;
  /** Days saved or revived by spending XP, all time. */
  xpSavesUsed: number;
  /** A freeze is earned every this many streak days… */
  freezeEarnEveryDays: number;
  /** …up to this many held at once. */
  freezeCap: number;
}

export async function fetchStreakStatus(): Promise<StreakStatus> {
  return apiFetch<StreakStatus>('/api/streaks/status');
}

export async function reviveStreak(method: 'freeze' | 'xp') {
  return apiFetch<{ streakCurrent: number; streakMax: number; streakFreezesAvailable: number; xp: number; state: StreakState }>(
    '/api/streaks/revive',
    { method: 'POST', body: { method } },
  );
}

export async function protectStreak(method: 'plant' | 'freeze' | 'xp') {
  return apiFetch('/api/streaks/protect', { method: 'POST', body: { method } });
}
