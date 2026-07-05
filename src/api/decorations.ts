import { apiFetch } from './client';
import type { EcosystemZoneKey } from '../constants/decorationCatalog';

export interface ApiDecorationType {
  id: string;
  key: string;
  zone: EcosystemZoneKey;
  name: string;
  colorway: string;
  variant: string;
  sortOrder: number;
}

export interface DecorationPathPoint {
  x: number;
  y: number;
}

export interface ApiDecorationPlacement {
  id: string;
  userId: string;
  decorationTypeId: string;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  /** Present only for freehand-drawn shapes (river/stream) — points normalized as canvas-fraction
   * offsets from the placement's own centroid (positionX/positionY). Null for catalog icon shapes. */
  path: DecorationPathPoint[] | null;
  createdAt: string;
  decorationType: ApiDecorationType;
}

export async function fetchDecorationTypes(): Promise<ApiDecorationType[]> {
  return apiFetch<ApiDecorationType[]>('/api/decorations/types');
}

export async function fetchDecorationPlacements(): Promise<ApiDecorationPlacement[]> {
  return apiFetch<ApiDecorationPlacement[]>('/api/decorations/placements');
}

export interface CreatePlacementInput {
  decorationTypeId: string;
  positionX: number;
  positionY: number;
  scale?: number;
  rotation?: number;
  path?: DecorationPathPoint[];
}

export type UpdatePlacementInput = Partial<{
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
}>;

export async function createDecorationPlacement(
  input: CreatePlacementInput
): Promise<ApiDecorationPlacement> {
  return apiFetch<ApiDecorationPlacement>('/api/decorations/placements', { method: 'POST', body: input });
}

export async function updateDecorationPlacement(
  id: string,
  input: UpdatePlacementInput
): Promise<ApiDecorationPlacement> {
  return apiFetch<ApiDecorationPlacement>(`/api/decorations/placements/${id}`, { method: 'PATCH', body: input });
}

export async function deleteDecorationPlacement(id: string): Promise<void> {
  await apiFetch(`/api/decorations/placements/${id}`, { method: 'DELETE' });
}
