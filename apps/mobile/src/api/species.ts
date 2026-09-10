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

// Tree/flower/environment glyphs only — mirrors the server's allow-list in species.schema.ts,
// which rejects anything outside it, so keep the two in sync.
export const SPECIES_EMOJI_OPTIONS = [
  '🌳', '🌲', '🌴', '🌵', '🎋', '🌱', '🪴', '🌿', '☘️', '🍀',
  '🌾', '🍁', '🍂', '🍃', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼',
  '💐', '🏵️', '🥭', '🍊', '🥥', '🫒', '🍈', '🌰',
  '🌍', '🌎', '🌏', '🌦️', '🌈', '☀️', '🌙', '⛰️',
] as const;

export async function createSpecies(input: { commonName: string; emoji: string }): Promise<ApiSpecies> {
  return apiFetch<ApiSpecies>('/api/species', { method: 'POST', body: input });
}
