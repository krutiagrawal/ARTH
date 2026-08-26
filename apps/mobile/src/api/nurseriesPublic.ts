import { apiFetch } from './client';
import type { ApiSaplingStock } from './nursery';

export interface ApiNurserySummary {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
  lat: number | string | null;
  lng: number | string | null;
}

export async function browseNurseries(params: { q?: string; city?: string } = {}): Promise<{ total: number; nurseries: ApiNurserySummary[] }> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.city) query.set('city', params.city);
  const qs = query.toString();
  return apiFetch(`/api/nurseries${qs ? `?${qs}` : ''}`);
}

export interface ApiPublicNurseryProfile {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
  contactPhone: string | null;
  lat: number | string | null;
  lng: number | string | null;
  stock: ApiSaplingStock[];
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
