import { apiFetch } from './client';
import type { ApiSaplingStock } from './nursery';
import type { ApiPost } from './posts';

export interface ApiNurserySummary {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
  lat: number | string | null;
  lng: number | string | null;
  avgRating: number | string | null;
  reviewCount: number;
  offersDelivery: boolean;
  distanceKm?: number;
}

export async function browseNurseries(
  params: { q?: string; city?: string; deliveryOnly?: boolean; minRating?: number; lat?: number; lng?: number; radiusKm?: number } = {},
): Promise<{ total: number; nurseries: ApiNurserySummary[] }> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.city) query.set('city', params.city);
  if (params.deliveryOnly) query.set('deliveryOnly', 'true');
  if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.radiusKm !== undefined) query.set('radiusKm', String(params.radiusKm));
  const qs = query.toString();
  return apiFetch(`/api/nurseries${qs ? `?${qs}` : ''}`);
}

export interface ApiPublicNurseryProfile {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  city: string | null;
  contactPhone: string | null;
  lat: number | string | null;
  lng: number | string | null;
  avgRating: number | string | null;
  reviewCount: number;
  offersDelivery: boolean;
  deliveryRadiusKm: number | null;
  followPolicy: 'open' | 'approval';
  followersCount: number;
  isFollowing: boolean;
  followStatus: 'pending' | 'accepted' | null;
  recentPosts: ApiPost[];
  stock: ApiSaplingStock[];
}

export async function followNursery(id: string): Promise<{ status: 'pending' | 'accepted' | null; followersCount: number }> {
  return apiFetch(`/api/nurseries/${id}/follow`, { method: 'POST' });
}

export async function unfollowNursery(id: string): Promise<{ status: null; followersCount: number }> {
  return apiFetch(`/api/nurseries/${id}/follow`, { method: 'DELETE' });
}

export async function fetchNurseryPublicProfile(id: string): Promise<ApiPublicNurseryProfile> {
  return apiFetch<ApiPublicNurseryProfile>(`/api/nurseries/${id}`);
}

export interface CreateReservationInput {
  nurseryId: string;
  stockId: string;
  quantity: number;
  message?: string;
}

export async function createReservation(input: CreateReservationInput): Promise<{ id: string }> {
  return apiFetch(`/api/nurseries/${input.nurseryId}/stock/${input.stockId}/reservations`, {
    method: 'POST',
    body: { quantity: input.quantity, message: input.message },
  });
}
