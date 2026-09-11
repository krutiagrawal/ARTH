import { apiFetch } from './client';

export interface ApiCity {
  id: string;
  name: string;
  isLaunched: boolean;
}

export async function fetchCities(): Promise<ApiCity[]> {
  return apiFetch<ApiCity[]>('/api/cities', { auth: false });
}
