import { apiFetch, toFormFile } from './client';

export interface ApiNgoUpdate {
  id: string;
  ngoId: string;
  ngoName: string;
  ngoLogoUrl: string | null;
  driveId: string | null;
  driveTitle: string | null;
  caption: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export async function fetchMyUpdates(): Promise<ApiNgoUpdate[]> {
  return apiFetch<ApiNgoUpdate[]>('/api/ngo/updates');
}

export interface CreateUpdateInput {
  caption?: string;
  driveId?: string;
  photo: { uri: string; name: string; type: string };
}

export async function createUpdate(input: CreateUpdateInput): Promise<ApiNgoUpdate> {
  const form = new FormData();
  if (input.caption) form.append('caption', input.caption);
  if (input.driveId) form.append('driveId', input.driveId);
  form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  return apiFetch<ApiNgoUpdate>('/api/ngo/updates', { method: 'POST', body: form, isForm: true });
}

export async function deleteUpdate(id: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/updates/${id}`, { method: 'DELETE' });
}
