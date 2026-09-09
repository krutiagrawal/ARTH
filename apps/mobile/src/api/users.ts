import { apiFetch } from './client';
import { persistAuthResponse, deviceInfo, type ApiUser, type AuthResponse } from './auth';

export interface ApiPublicProfile {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  avatarEmoji: string;
  level: number;
  treesPlantedCount: number;
  streakCurrent: number;
  badgesCount: number;
  isOnline: boolean;
  lastActiveAt: string | null;
  friendStatus: 'none' | 'pending' | 'accepted';
}

export interface ApiSession {
  id: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
}

export async function fetchPublicProfile(userId: string): Promise<ApiPublicProfile> {
  return apiFetch<ApiPublicProfile>(`/api/users/${userId}`);
}

export async function updateMe(input: { name?: string; handle?: string; avatarEmoji?: string; bio?: string | null }): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users/me', { method: 'PATCH', body: input });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiUser> {
  const response = await apiFetch<AuthResponse>('/api/users/me/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword, deviceInfo },
  });
  return persistAuthResponse(response);
}

export async function fetchSessions(): Promise<ApiSession[]> {
  return apiFetch<ApiSession[]>('/api/auth/sessions');
}

export async function revokeSession(id: string): Promise<void> {
  await apiFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
}
