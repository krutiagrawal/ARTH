import { apiFetch, toFormFile } from './client';
import { persistAuthResponse, deviceInfo, type ApiUser, type AuthResponse } from './auth';

export interface ApiPublicProfile {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  avatarEmoji: string;
  avatarUrl: string | null;
  memberSince: string;
  /** City, interests and stats are each null/empty when their owner has hidden that section. */
  city: string | null;
  gardeningExperience: string | null;
  speciesInterest: string[];
  plantingGoal: number | null;
  treesPlantedThisYear: number | null;
  statsHidden: boolean;
  level: number;
  treesPlantedCount: number | null;
  streakCurrent: number | null;
  streakMax: number | null;
  badgesCount: number | null;
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

export async function updateMe(input: { name?: string; handle?: string; avatarEmoji?: string; bio?: string | null; city?: string | null }): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users/me', { method: 'PATCH', body: input });
}

export async function uploadAvatar(photo: { uri: string; name: string; type: string }): Promise<ApiUser> {
  const form = new FormData();
  form.append('photo', toFormFile(photo.uri), photo.name);
  return apiFetch<ApiUser>('/api/users/me/avatar', { method: 'POST', body: form, isForm: true });
}

export async function removeAvatar(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users/me/avatar', { method: 'DELETE' });
}

export interface PersonalizeInput {
  city?: string;
  plantingSpace?: ('balcony' | 'terrace' | 'garden' | 'farmland' | 'city_outskirts' | 'open_land' | 'none')[];
  gardeningExperience?: 'beginner' | 'intermediate' | 'experienced';
  motivation?: ('home_gardening' | 'environmental_cause' | 'school_or_csr_project' | 'hobby' | 'other')[];
  dateOfBirth?: string;
  speciesInterest?: ('fruit' | 'flowering' | 'shade' | 'medicinal' | 'native')[];
  homeSunlight?: 'full_sun' | 'partial_shade' | 'shade';
  plantingGoal?: number;
}

export async function personalizeMe(input: PersonalizeInput): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users/me/personalize', { method: 'PATCH', body: input });
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
