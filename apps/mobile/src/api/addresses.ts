import { apiFetch } from './client';

export interface ApiAddress {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
  lat: string | null;
  lng: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface UpsertAddressInput {
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export async function fetchAddresses(): Promise<ApiAddress[]> {
  return apiFetch<ApiAddress[]>('/api/addresses');
}

export async function createAddress(input: UpsertAddressInput): Promise<ApiAddress> {
  return apiFetch<ApiAddress>('/api/addresses', { method: 'POST', body: input });
}

export async function updateAddress(id: string, input: Partial<UpsertAddressInput>): Promise<ApiAddress> {
  return apiFetch<ApiAddress>(`/api/addresses/${id}`, { method: 'PATCH', body: input });
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
}
