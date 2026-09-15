import { Platform } from 'react-native';
import { apiFetch, toFormFile } from './client';
import { setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from './tokenStorage';
import type { PickedPhoto } from './posts';

export interface ApiUser {
  id: string;
  role: 'user' | 'ngo' | 'group' | 'nursery' | 'corporate' | 'admin' | 'delivery_partner';
  email: string;
  name: string;
  handle: string;
  bio: string | null;
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

export interface AvailabilityResult {
  email?: { available: boolean };
  phone?: { available: boolean };
  handle?: { available: boolean };
}

export async function checkAvailability(input: { email?: string; phone?: string; handle?: string }): Promise<AvailabilityResult> {
  const params = new URLSearchParams();
  if (input.email) params.set('email', input.email);
  if (input.phone) params.set('phone', input.phone);
  if (input.handle) params.set('handle', input.handle);
  return apiFetch<AvailabilityResult>(`/api/auth/check-availability?${params.toString()}`, { auth: false });
}

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

export async function registerNgo(input: {
  email: string;
  password: string;
  name: string;
  handle: string;
  orgName: string;
  description: string;
  website?: string;
  contactPhone?: string;
}) {
  const response = await apiFetch<AuthResponse>('/api/auth/register-ngo', {
    method: 'POST',
    body: { ...input, deviceInfo },
    auth: false,
  });
  return persistAuthResponse(response);
}

export async function registerGroup(input: {
  email: string;
  password: string;
  name: string;
  handle: string;
  groupName: string;
  groupType: 'family' | 'school' | 'club' | 'other';
  description: string;
}) {
  const response = await apiFetch<AuthResponse>('/api/auth/register-group', {
    method: 'POST',
    body: { ...input, deviceInfo },
    auth: false,
  });
  return persistAuthResponse(response);
}

export type NurseryType =
  | 'retail'
  | 'wholesale'
  | 'native_plant'
  | 'government'
  | 'ngo_community'
  | 'landscaping'
  | 'other';

export interface RegisterNurseryInput {
  email: string;
  password: string;
  name: string;
  handle: string;
  nurseryName: string;
  description: string;
  city?: string;
  contactPhone?: string;
  line1?: string;
  lat?: number;
  lng?: number;
  yearEstablished?: number;
  nurseryType: NurseryType;
  websiteUrl?: string;
  responsiblePersonName?: string;
  responsiblePersonRole?: string;
  responsiblePersonPhone?: string;
  plantCategories?: string[];
  approxPlantCount?: string;
  seasonalAvailability?: boolean;
  bulkSupply?: boolean;
  gstin?: string;
  businessRegistrationNumber?: string;
  tradeLicenseNumber?: string;
  ngoRegistrationNumber?: string;
  governmentNurseryId?: string;
  /** Mandatory real-time camera capture of the nursery's name board — see NurseryRegisterScreen. */
  verificationPhoto: PickedPhoto;
}

export async function registerNursery(input: RegisterNurseryInput) {
  const { verificationPhoto, plantCategories, lat, lng, yearEstablished, seasonalAvailability, bulkSupply, ...rest } = input;
  const form = new FormData();
  const scalar: [string, unknown][] = [
    ...Object.entries(rest),
    ['lat', lat],
    ['lng', lng],
    ['yearEstablished', yearEstablished],
    ['seasonalAvailability', seasonalAvailability],
    ['bulkSupply', bulkSupply],
    ['plantCategories', plantCategories?.length ? plantCategories.join(',') : undefined],
    ['deviceInfo', deviceInfo],
  ];
  for (const [key, value] of scalar) {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
  }
  form.append('verificationPhoto', toFormFile(verificationPhoto.uri), verificationPhoto.name);

  const response = await apiFetch<AuthResponse>('/api/auth/register-nursery', {
    method: 'POST',
    body: form,
    isForm: true,
    auth: false,
  });
  return persistAuthResponse(response);
}

export async function registerCorporate(input: {
  email: string;
  password: string;
  name: string;
  handle: string;
  companyName: string;
  description: string;
  industry?: string;
  city?: string;
}) {
  const response = await apiFetch<AuthResponse>('/api/auth/register-corporate', {
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
