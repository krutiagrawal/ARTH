import { apiFetch } from './client';

export interface ApiAddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  city: string | null;
}

export async function searchAddress(query: string): Promise<ApiAddressSuggestion[]> {
  return apiFetch<ApiAddressSuggestion[]>(`/api/geocode/search?q=${encodeURIComponent(query)}`);
}
