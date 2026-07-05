import { Platform } from 'react-native';
import { apiFetch } from './client';
import { setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from './tokenStorage';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  xp: number;
  level: number;
  streakCurrent: number;
  streakMax: number;
  streakFreezesAvailable: number;
  treesPlantedCount: number;
  totalCo2Absorbed: number;
  badgesCount: number;
  selectedForestThemeId: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export const deviceInfo = `${Platform.OS} ${Platform.Version}`;

export async function persistAuthResponse(response: AuthResponse): Promise<ApiUser> {
  await setAccessToken(response.accessToken);
  await setRefreshToken(response.refreshToken);
  return response.user;
}

export async function register(input: { email: string; password: string; name: string; handle: string }) {
  const response = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { ...input, deviceInfo },
    auth: false,
  });
  return persistAuthResponse(response);
}

export async function login(input: { email: string; password: string }) {
  const response = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { ...input, deviceInfo },
    auth: false,
  });
  return persistAuthResponse(response);
}

export async function fetchMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users/me');
}

export async function deleteAccount(): Promise<void> {
  await apiFetch('/api/users/me', { method: 'DELETE' });
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
    } catch {
      // ignore network errors on logout — clear local tokens regardless
    }
  }
  await clearTokens();
}
