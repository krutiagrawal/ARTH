import { apiFetch, toFormFile } from './client';

export type TreeHealthStatus = 'healthy' | 'struggling' | 'dead' | 'removed';

export interface ApiPlantedTree {
  id: string;
  ngoId: string;
  driveId: string | null;
  driveTitle: string | null;
  speciesName: string;
  label: string | null;
  plantedAt: string;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  latestStatus: TreeHealthStatus;
}

export interface ListPlantedTreesFilter {
  driveId?: string;
  speciesName?: string;
  page?: number;
  take?: number;
}

export async function fetchPlantedTrees(filter: ListPlantedTreesFilter = {}): Promise<{ total: number; trees: ApiPlantedTree[] }> {
  const query = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch(`/api/ngo/planted-trees${qs ? `?${qs}` : ''}`);
}

export interface BulkCreatePlantedTreesInput {
  driveId?: string;
  speciesName: string;
  count: number;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  photo?: { uri: string; name: string; type: string };
}

export async function bulkCreatePlantedTrees(input: BulkCreatePlantedTreesInput): Promise<{ createdCount: number; plantedTreeIds: string[] }> {
  const form = new FormData();
  if (input.driveId) form.append('driveId', input.driveId);
  form.append('speciesName', input.speciesName);
  form.append('count', String(input.count));
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  if (input.lat !== undefined) form.append('lat', String(input.lat));
  if (input.lng !== undefined) form.append('lng', String(input.lng));
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }
  return apiFetch('/api/ngo/planted-trees/bulk', { method: 'POST', body: form, isForm: true });
}

export async function logHealthCheck(
  plantedTreeId: string,
  input: { status: TreeHealthStatus; notes?: string },
): Promise<void> {
  const form = new FormData();
  form.append('status', input.status);
  if (input.notes) form.append('notes', input.notes);
  await apiFetch(`/api/ngo/planted-trees/${plantedTreeId}/health-checks`, { method: 'POST', body: form, isForm: true });
}

export async function logBulkHealthChecks(input: {
  plantedTreeIds: string[];
  status: TreeHealthStatus;
  notes?: string;
}): Promise<{ updatedCount: number }> {
  return apiFetch('/api/ngo/planted-trees/health-checks/bulk', { method: 'POST', body: input });
}

export interface SurvivalStats {
  total: number;
  counts: Record<TreeHealthStatus, number>;
  survivalRate: number;
}

export async function fetchSurvivalStats(driveId?: string): Promise<SurvivalStats> {
  const qs = driveId ? `?driveId=${driveId}` : '';
  return apiFetch<SurvivalStats>(`/api/ngo/planted-trees/survival-stats${qs}`);
}
