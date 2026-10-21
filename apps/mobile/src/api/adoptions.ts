import { ownedQuery } from './drives';
import { apiFetch, toFormFile, type OwnedListSummary, type OwnedExport } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';
import type { TreeHealthStatus } from './plantedTrees';
import type { PassportTimelineEntry, PendingUpdate } from './trees';

export interface ApiAdoptableTree {
  id: string;
  ngoId: string;
  ngoName: string;
  nickname: string;
  speciesName: string;
  description: string;
  instructions: string | null;
  photoUri: string | null;
  location: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  status: 'available' | 'adopted' | 'removed';
  isAdopted: boolean;
  isArchived?: boolean;
  distanceKm?: number;
  /** Set when the NGO created the listing from a real planted tree (has a Tree Passport). */
  plantedTreeId?: string | null;
  healthStatus?: TreeHealthStatus;
  lastCheckedAt?: string | null;
  /** Every listing has a status; 'not_checked' until the first update. Only the adopter's own list has the count below. */
  /** Community updates still awaiting the adopter's decision. */
  pendingUpdatesCount?: number;
  adopter?: { name: string; handle: string; message: string | null; adoptedAt: string };
}

export async function fetchAdoptableTrees(params: { lat?: number; lng?: number; ngoId?: string } = {}): Promise<ApiAdoptableTree[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.ngoId) query.set('ngoId', params.ngoId);
  const qs = query.toString();
  return apiFetch<ApiAdoptableTree[]>(`/api/adoptable-trees${qs ? `?${qs}` : ''}`);
}

export async function fetchAdoptableTree(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}`);
}

export async function adoptTree(id: string, message?: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/adopt`, {
    method: 'POST',
    body: message ? { message } : {},
  });
}

export interface MyAdoptionsFilter {
  q?: string;
  sort?: 'newest' | 'oldest' | 'name';
}

export async function fetchMyAdoptions(cursor?: string, filter: MyAdoptionsFilter = {}): Promise<Page<ApiAdoptableTree>> {
  return apiFetch<Page<ApiAdoptableTree>>(pagedPath('/api/adoptable-trees/my-adoptions', cursor, { q: filter.q, sort: filter.sort }));
}

export async function fetchMyAdoptionsSummary(): Promise<OwnedListSummary> {
  return apiFetch<OwnedListSummary>('/api/adoptable-trees/my-adoptions/summary');
}
export async function exportMyAdoptions(): Promise<OwnedExport> {
  return apiFetch<OwnedExport>('/api/adoptable-trees/my-adoptions/export');
}

export async function releaseMyAdoption(id: string, reason?: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/adopt/release`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

// ---------- NGO-facing ----------

export interface OwnedTreeFilter {
  q?: string;
  status?: 'available' | 'adopted' | 'removed';
  archived?: boolean;
  sort?: 'newest' | 'oldest' | 'name';
}

export async function fetchMyAdoptableTrees(
  page?: number,
  take?: number,
  filter: OwnedTreeFilter = {},
): Promise<ApiAdoptableTree[]> {
  return apiFetch<ApiAdoptableTree[]>(`/api/adoptable-trees/mine${ownedQuery(page, take, { ...filter, archived: filter.archived ? 'true' : undefined })}`);
}

export interface CreateAdoptableTreeInput {
  nickname: string;
  speciesName: string;
  description: string;
  instructions?: string;
  locationLabel?: string;
  city: string;
  photo?: { uri: string; name: string; type: string };
}

export async function createAdoptableTree(input: CreateAdoptableTreeInput): Promise<ApiAdoptableTree> {
  const form = new FormData();
  form.append('nickname', input.nickname);
  form.append('speciesName', input.speciesName);
  form.append('description', input.description);
  if (input.instructions) form.append('instructions', input.instructions);
  if (input.locationLabel) form.append('locationLabel', input.locationLabel);
  form.append('city', input.city);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiAdoptableTree>('/api/adoptable-trees', { method: 'POST', body: form, isForm: true });
}

/** Delists a tree – if it's currently adopted, the backend releases that adoption and notifies
 * the adopter as part of the same call. */
export async function removeAdoptableTree(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}`, { method: 'DELETE' });
}

/** NGO-initiated release – puts an adopted tree back in the public pool without delisting it. */
export async function releaseAdoption(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/release`, { method: 'POST', body: {} });
}

export interface AdopterCheckInInput {
  status: Exclude<TreeHealthStatus, 'not_checked'>;
  note?: string;
  photo: { uri: string; name: string; type: string };
}

/** The adopter's live-photo check-in on the tree they adopted. */
export async function logAdopterCheckIn(adoptableTreeId: string, input: AdopterCheckInInput): Promise<unknown> {
  const form = new FormData();
  form.append('status', input.status);
  if (input.note?.trim()) form.append('note', input.note.trim());
  form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  return apiFetch(`/api/adoptable-trees/${adoptableTreeId}/check-in`, { method: 'POST', body: form, isForm: true });
}

export interface AdoptionStatus {
  adoptableTreeId: string;
  plantedTreeId: string | null;
  publicId: string | null;
  /** True when the signed-in user is this tree's adopter. */
  isAdopter: boolean;
  timeline: PassportTimelineEntry[];
  /** Community updates awaiting a decision; only returned to the adopter. */
  pendingUpdates: PendingUpdate[];
}

export async function fetchAdoptionStatus(adoptableTreeId: string): Promise<AdoptionStatus> {
  return apiFetch<AdoptionStatus>(`/api/adoptable-trees/${adoptableTreeId}/status`);
}

export type UpdateAdoptableTreeInput = Partial<CreateAdoptableTreeInput>;

export async function updateAdoptableTree(id: string, input: UpdateAdoptableTreeInput): Promise<ApiAdoptableTree> {
  const form = new FormData();
  if (input.nickname !== undefined) form.append('nickname', input.nickname);
  if (input.speciesName !== undefined) form.append('speciesName', input.speciesName);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.instructions !== undefined) form.append('instructions', input.instructions);
  if (input.locationLabel !== undefined) form.append('locationLabel', input.locationLabel);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.photo) form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}`, { method: 'PATCH', body: form, isForm: true });
}

/** Permanent delete – refused for adopted trees or ones with history (delist instead). */
export async function deleteAdoptableTree(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/adoptable-trees/${id}/permanent`, { method: 'DELETE' });
}

/** Puts a removed (delisted) tree back on the public list as available. */
export async function relistAdoptableTree(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/relist`, { method: 'POST' });
}

export async function fetchOwnedTreeSummary(): Promise<OwnedListSummary> {
  return apiFetch<OwnedListSummary>('/api/adoptable-trees/mine/summary');
}
export async function exportOwnedTrees(): Promise<OwnedExport> {
  return apiFetch<OwnedExport>('/api/adoptable-trees/mine/export');
}
export async function duplicateAdoptableTree(id: string): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/duplicate`, { method: 'POST' });
}
export async function archiveAdoptableTree(id: string, archived: boolean): Promise<ApiAdoptableTree> {
  return apiFetch<ApiAdoptableTree>(`/api/adoptable-trees/${id}/archive`, { method: 'POST', body: { archived } });
}
