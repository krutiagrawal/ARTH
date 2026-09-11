import { apiFetch } from './client';
import type { BulkRequirementStatus, BulkResponseStatus } from './nursery';

// NGO-side counterpart to api/nursery.ts's bulk-requirement endpoints — same underlying
// BulkRequirement/BulkRequirementResponse records, viewed/managed from the NGO role instead.

export interface ApiNgoBulkResponse {
  id: string;
  nurseryId: string;
  nursery: { nurseryName: string; logoUrl: string | null; city: string | null };
  quantityOffered: number;
  priceCents: number | null;
  canDeliver: boolean;
  canPickup: boolean;
  message: string | null;
  status: BulkResponseStatus;
  createdAt: string;
}

export interface ApiNgoBulkRequirement {
  id: string;
  driveId: string | null;
  speciesId: string | null;
  speciesNote: string | null;
  nativePreferred: boolean;
  quantityNeeded: number;
  quantityFulfilled: number;
  neededByDate: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  status: BulkRequirementStatus;
  species: { commonName: string } | null;
  createdAt: string;
  responses?: ApiNgoBulkResponse[];
}

export async function fetchNgoBulkRequirements(status?: BulkRequirementStatus): Promise<ApiNgoBulkRequirement[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<ApiNgoBulkRequirement[]>(`/api/ngo/bulk-requirements${query}`);
}

export async function fetchNgoBulkRequirement(id: string): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>(`/api/ngo/bulk-requirements/${id}`);
}

export interface CreateNgoBulkRequirementInput {
  driveId?: string;
  speciesId?: string;
  speciesNote?: string;
  nativePreferred?: boolean;
  quantityNeeded: number;
  neededByDate?: string;
  city?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

export async function createNgoBulkRequirement(input: CreateNgoBulkRequirementInput): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>('/api/ngo/bulk-requirements', { method: 'POST', body: input });
}

export async function cancelNgoBulkRequirement(id: string): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>(`/api/ngo/bulk-requirements/${id}/cancel`, { method: 'POST' });
}

export async function acceptNgoBulkResponse(responseId: string): Promise<ApiNgoBulkResponse> {
  return apiFetch<ApiNgoBulkResponse>(`/api/ngo/bulk-requirements/responses/${responseId}/accept`, { method: 'POST' });
}

export async function declineNgoBulkResponse(responseId: string): Promise<ApiNgoBulkResponse> {
  return apiFetch<ApiNgoBulkResponse>(`/api/ngo/bulk-requirements/responses/${responseId}/decline`, { method: 'POST' });
}
