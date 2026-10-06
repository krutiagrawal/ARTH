import { apiFetch, toFormFile } from './client';
import type { TreeHealthStatus } from './plantedTrees';

export interface LogCommunityObservationInput {
  targetKind: 'tree' | 'planted-tree';
  targetId: string;
  status: Exclude<TreeHealthStatus, 'not_checked'>;
  note?: string;
  lat: number;
  lng: number;
  accuracy: number;
  mocked: boolean;
  photo: { uri: string; name: string; type: string };
}

// Fresh-camera-only, strictly geofenced (~15m of the tree's true coordinates, server-side —
// see plantingLocation.service.ts). The confirmation screen that calls this already re-fetches
// GPS right before submit, same convention as PlantTreeScreen's own submit-time fix.
export async function logCommunityObservation(input: LogCommunityObservationInput): Promise<unknown> {
  const form = new FormData();
  form.append('targetKind', input.targetKind);
  form.append('targetId', input.targetId);
  form.append('status', input.status);
  if (input.note?.trim()) form.append('note', input.note.trim());
  form.append('lat', String(input.lat));
  form.append('lng', String(input.lng));
  form.append('accuracy', String(input.accuracy));
  form.append('mocked', input.mocked ? 'true' : 'false');
  form.append('photo', toFormFile(input.photo.uri), input.photo.name);

  return apiFetch('/api/tree-observations', { method: 'POST', body: form, isForm: true });
}

export async function reviewTreeUpdate(observationId: string, decision: 'accept' | 'reject'): Promise<unknown> {
  return apiFetch(`/api/tree-observations/${observationId}/${decision}`, { method: 'POST' });
}
