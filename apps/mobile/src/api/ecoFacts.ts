import { apiFetch } from './client';

export async function fetchEcoFacts(): Promise<string[]> {
  return apiFetch<string[]>('/api/eco-facts', { auth: false });
}
