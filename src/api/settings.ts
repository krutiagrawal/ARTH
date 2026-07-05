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
}

export async function fetchSettings(): Promise<ApiUserSettings> {
  return apiFetch<ApiUserSettings>('/api/users/me/settings');
}

export async function updateSettings(patch: Partial<ApiUserSettings>): Promise<ApiUserSettings> {
  return apiFetch<ApiUserSettings>('/api/users/me/settings', { method: 'PATCH', body: patch });
}
