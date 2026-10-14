import { apiFetch } from './client';

export interface ApiUserSettings {
  haptics: boolean;
  notifications: boolean;
  ambientMode: boolean;
  sounds: boolean;
  darkMode: boolean;
  streakReminders: boolean;
  locationTracking: boolean;
  publicProfile: boolean;
  analyticsEnabled: boolean;
  /** Per-section visibility on the public profile. */
  showCity: boolean;
  showStats: boolean;
  showInterests: boolean;
  /** Which homepage time-of-day theme to always show, instead of following real time of day.
   * `null` = auto (default). Stores a `TimePeriod` key from `hooks/useTimeTheme`. */
  pinnedTimeTheme: string | null;
}

export async function fetchSettings(): Promise<ApiUserSettings> {
  return apiFetch<ApiUserSettings>('/api/users/me/settings');
}

export async function updateSettings(patch: Partial<ApiUserSettings>): Promise<ApiUserSettings> {
  return apiFetch<ApiUserSettings>('/api/users/me/settings', { method: 'PATCH', body: patch });
}
