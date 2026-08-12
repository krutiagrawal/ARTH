import { apiFetch } from './client';

export interface ApiSpecies {
  id: string;
  key: string;
  commonName: string;
  emoji: string;
  co2KgPerYear: string | null;
  description: string | null;
}

export async function fetchSpecies(): Promise<ApiSpecies[]> {
  return apiFetch<ApiSpecies[]>('/api/species', { auth: false });
}
