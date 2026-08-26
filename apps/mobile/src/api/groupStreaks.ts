import { apiFetch } from './client';
import type { StreakWeek } from './streaks';

export type { StreakWeek };

// Owner-facing (role 'group').
export async function fetchGroupStreakCalendar(weeks = 4): Promise<StreakWeek[]> {
  return apiFetch<StreakWeek[]>(`/api/group/streaks/calendar?weeks=${weeks}`);
}

// Member-facing (any authenticated user viewing a group they belong to).
export async function fetchGroupStreakCalendarForMember(groupId: string, weeks = 4): Promise<StreakWeek[]> {
  return apiFetch<StreakWeek[]>(`/api/groups/${groupId}/streaks/calendar?weeks=${weeks}`);
}
