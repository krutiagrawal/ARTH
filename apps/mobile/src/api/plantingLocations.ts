import { apiFetch } from './client';

export interface ApiApprovedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface PlantingEligibility {
  eligible: boolean;
  location?: { id: string; name: string };
}

export async function fetchApprovedLocations(): Promise<ApiApprovedLocation[]> {
  return apiFetch<ApiApprovedLocation[]>('/api/planting-locations');
}

export async function checkPlantingEligibility(input: { lat: number; lng: number }): Promise<PlantingEligibility> {
  return apiFetch<PlantingEligibility>('/api/planting-locations/check', { method: 'POST', body: input });
}
