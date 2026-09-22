import { apiFetch, toFormFile } from './client';

export type TreeHealthStatus = 'not_checked' | 'healthy' | 'struggling' | 'dead' | 'removed';
/** A status you can actually log a check as — 'not_checked' is a derived absence-of-check state. */
export type ActionableHealthStatus = Exclude<TreeHealthStatus, 'not_checked'>;

export interface ApiPlantedTree {
  id: string;
  ngoId: string;
  driveId: string | null;
  driveTitle: string | null;
  zoneId: string | null;
  zoneName: string | null;
  speciesName: string;
  label: string | null;
  plantedAt: string;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  latestStatus: TreeHealthStatus;
}

export interface ApiTreeHealthCheck {
  id: string;
  plantedTreeId: string;
  status: TreeHealthStatus;
  notes: string | null;
  photoUrl: string | null;
  checkedAt: string;
}

export interface ListPlantedTreesFilter {
  driveId?: string;
  /** omit = no zone filter, 'unzoned' = only unzoned trees, otherwise a specific zone id. */
  zoneId?: string | 'unzoned';
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
  zoneId?: string;
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
  if (input.zoneId) form.append('zoneId', input.zoneId);
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

export async function fetchPlantedTree(plantedTreeId: string): Promise<ApiPlantedTree> {
  return apiFetch(`/api/ngo/planted-trees/${plantedTreeId}`);
}

export async function fetchHealthCheckHistory(plantedTreeId: string): Promise<{ checks: ApiTreeHealthCheck[] }> {
  return apiFetch(`/api/ngo/planted-trees/${plantedTreeId}/health-checks`);
}

export async function logHealthCheck(
  plantedTreeId: string,
  input: { status: ActionableHealthStatus; notes?: string },
): Promise<void> {
  const form = new FormData();
  form.append('status', input.status);
  if (input.notes) form.append('notes', input.notes);
  await apiFetch(`/api/ngo/planted-trees/${plantedTreeId}/health-checks`, { method: 'POST', body: form, isForm: true });
}

export async function logBulkHealthChecks(input: {
  plantedTreeIds: string[];
  status: ActionableHealthStatus;
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

// ---------- Plantation zones ----------

export interface ZoneRollup {
  total: number;
  counts: Record<TreeHealthStatus, number>;
  survivalRate: number;
  lastCheckedAt: string | null;
  nextCheckDue: string | null;
}

export interface ApiPlantationZone extends ZoneRollup {
  id: string | null;
  name: string;
  driveId: string;
}

export interface ApiPlantationSummary extends ZoneRollup {
  driveId: string;
  driveTitle: string;
  zoneCount: number;
}

export async function fetchPlantations(): Promise<{ plantations: ApiPlantationSummary[] }> {
  return apiFetch('/api/ngo/planted-trees/plantations');
}

export async function fetchZonesForDrive(
  driveId: string,
): Promise<{ drive: { id: string; title: string }; zones: ApiPlantationZone[]; unzoned: ApiPlantationZone | null }> {
  return apiFetch(`/api/ngo/planted-trees/zones?driveId=${driveId}`);
}

export async function fetchZoneDetail(zoneId: string): Promise<ApiPlantationZone> {
  return apiFetch(`/api/ngo/planted-trees/zones/${zoneId}`);
}

export async function createZone(input: { driveId: string; name: string }): Promise<ApiPlantationZone> {
  return apiFetch('/api/ngo/planted-trees/zones', { method: 'POST', body: input });
}

export async function renameZone(zoneId: string, name: string): Promise<ApiPlantationZone> {
  return apiFetch(`/api/ngo/planted-trees/zones/${zoneId}`, { method: 'PATCH', body: { name } });
}

export async function deleteZone(zoneId: string): Promise<void> {
  await apiFetch(`/api/ngo/planted-trees/zones/${zoneId}`, { method: 'DELETE' });
}

export async function bulkMarkZoneHealth(
  zoneId: string,
  status: ActionableHealthStatus,
  notes?: string,
): Promise<{ updatedCount: number }> {
  return apiFetch(`/api/ngo/planted-trees/zones/${zoneId}/health-checks/bulk`, { method: 'POST', body: { status, notes } });
}
