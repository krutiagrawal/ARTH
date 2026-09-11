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

export interface ApiNearbyStock {
  nurseryId: string;
  nurseryName: string;
  distanceKm: number;
  quantity: number;
  priceCents: number | null;
  isFree: boolean;
  stockId: string;
}

/** "Recommended nearby" card on PlantTreeScreen once a species is picked manually — surfaces
 * ARTH nurseries stocking that species close to the planter's current GPS fix. */
export async function fetchNearbyStock(speciesId: string, lat: number, lng: number, radiusKm = 15): Promise<ApiNearbyStock[]> {
  return apiFetch<ApiNearbyStock[]>(
    `/api/species/${speciesId}/nearby-stock?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
  );
}
