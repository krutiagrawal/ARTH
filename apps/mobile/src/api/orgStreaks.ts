import { apiFetch } from './client';
import type { StreakStatus, StreakState } from './streaks';

interface OrgStreakStatusResponse extends Omit<StreakStatus, 'reviveDate' | 'freezeEarnEveryDays'> {
  reviveWeek: string | null;
  freezeEarnEveryWeeks: number;
}

/**
 * NGO/nursery streaks are weekly. The server's status is mapped onto the individual StreakStatus
 * shape (with `weekly: true`) so StreakProtectionScreen/StreakInfoSheet render both from one model;
 * `freezeEarnEveryDays` then holds the number of *weeks*.
 */
export async function fetchOrgStreakStatus(): Promise<StreakStatus> {
  const { reviveWeek, freezeEarnEveryWeeks, ...rest } = await apiFetch<OrgStreakStatusResponse>('/api/org-streaks/status');
  return { ...rest, reviveDate: reviveWeek, freezeEarnEveryDays: freezeEarnEveryWeeks, weekly: true };
}

export async function reviveOrgStreak(method: 'freeze' | 'xp') {
  return apiFetch<{ streakCurrent: number; streakMax: number; streakFreezesAvailable: number; xp: number; state: StreakState }>(
    '/api/org-streaks/revive',
    { method: 'POST', body: { method } },
  );
}

export async function protectOrgStreak(method: 'freeze' | 'xp') {
  return apiFetch('/api/org-streaks/protect', { method: 'POST', body: { method } });
}

/** Orgs' week is open until Sunday; nudge from Friday, like the server reminder job (UTC). */
export function isOrgAtRiskDays(now = new Date()): boolean {
  const d = now.getUTCDay();
  return d === 5 || d === 6 || d === 0;
}
