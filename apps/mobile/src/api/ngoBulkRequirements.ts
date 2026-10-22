import { apiFetch } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';
import type { BulkRequirementStatus, BulkResponseStatus } from './nursery';

// NGO-side counterpart to api/nursery.ts's bulk-requirement endpoints – same underlying
// BulkRequirement/BulkRequirementResponse records, viewed/managed from the NGO role instead.

export interface ApiNgoBulkResponse {
  id: string;
  nurseryId: string;
  nursery: { nurseryName: string; logoUrl: string | null; city: string | null; avgRating?: number | null };
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
  species: { commonName: string; emoji: string } | null;
  /** The drive this is for, when the NGO linked one (detail only). */
  drive?: { id: string; title: string; startsAt: string } | null;
  createdAt: string;
  responses?: ApiNgoBulkResponse[];
  // Summaries the list computes server-side so a card needs no per-row fetch.
  /** Live offers (not declined / withdrawn). */
  offerCount?: number;
  /** Offers waiting for the NGO to accept or decline. */
  pendingOffers?: number;
  /** Handed off by the nursery, waiting for the NGO to confirm receipt. */
  awaitingReceipt?: number;
  /** Saplings promised so far by accepted / handed-off / fulfilled offers. */
  acceptedQuantity?: number;
}

export type RequirementFilter = 'all' | 'attention' | 'open' | 'partially_fulfilled' | 'fulfilled' | 'expired' | 'cancelled';
export type RequirementSort = 'newest' | 'oldest' | 'deadline' | 'biggest';

export interface RequirementQuery {
  search?: string;
  filter?: RequirementFilter;
  sort?: RequirementSort;
}

export type RequirementCounts = Record<RequirementFilter, number>;

export interface RequirementPage extends Page<ApiNgoBulkRequirement> {
  total: number;
  counts: RequirementCounts;
}

export async function fetchNgoBulkRequirements(cursor?: string, q: RequirementQuery = {}): Promise<RequirementPage> {
  return apiFetch<RequirementPage>(pagedPath('/api/ngo/bulk-requirements', cursor, { search: q.search?.trim(), filter: q.filter, sort: q.sort }));
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

/** Send only the fields that changed; `null` clears an optional one. */
export interface UpdateNgoBulkRequirementInput {
  speciesId?: string | null;
  speciesNote?: string | null;
  nativePreferred?: boolean;
  quantityNeeded?: number;
  neededByDate?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
}

export async function updateNgoBulkRequirement(id: string, input: UpdateNgoBulkRequirementInput): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>(`/api/ngo/bulk-requirements/${id}`, { method: 'PATCH', body: input });
}

export async function cancelNgoBulkRequirement(id: string): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>(`/api/ngo/bulk-requirements/${id}/cancel`, { method: 'POST' });
}

/** Only valid once a requirement has auto-expired (its deadline passed unfulfilled) – reopens it
 * to nurseries with a new neededByDate. */
export async function rescheduleNgoBulkRequirement(id: string, neededByDate: string): Promise<ApiNgoBulkRequirement> {
  return apiFetch<ApiNgoBulkRequirement>(`/api/ngo/bulk-requirements/${id}/reschedule`, {
    method: 'POST',
    body: { neededByDate },
  });
}

export async function acceptNgoBulkResponse(responseId: string): Promise<ApiNgoBulkResponse> {
  return apiFetch<ApiNgoBulkResponse>(`/api/ngo/bulk-requirements/responses/${responseId}/accept`, { method: 'POST' });
}

export async function declineNgoBulkResponse(responseId: string): Promise<ApiNgoBulkResponse> {
  return apiFetch<ApiNgoBulkResponse>(`/api/ngo/bulk-requirements/responses/${responseId}/decline`, { method: 'POST' });
}

/** Confirms the NGO actually received the handed-off saplings – the code is the one the nursery
 * shared in person. Only this call (not the nursery's own handoff) mints traceable sapling units
 * and updates the nursery's reputation, so fulfilment is never nursery-self-attested alone. */
export async function confirmNgoBulkResponseReceived(responseId: string, code: string): Promise<ApiNgoBulkResponse> {
  return apiFetch<ApiNgoBulkResponse>(`/api/ngo/bulk-requirements/responses/${responseId}/confirm-received`, {
    method: 'POST',
    body: { code },
  });
}
