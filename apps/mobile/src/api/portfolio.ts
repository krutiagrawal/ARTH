import { apiFetch, toFormFile } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';
import type { PickedPhoto } from './posts';

export interface ApiPortfolioMedia {
  id: string;
  url: string;
  order: number;
  caption: string | null;
}

export interface ApiPortfolioEntry {
  id: string;
  title: string;
  description: string | null;
  happenedOn: string;
  locationLabel: string | null;
  city: string | null;
  treesPlanted: number | null;
  volunteersInvolved: number | null;
  partnerOrgs: string | null;
  sortOrder: number;
  likeCount: number;
  likedByMe: boolean;
  media: ApiPortfolioMedia[];
  createdAt: string;
}

export interface PortfolioInput {
  title: string;
  description?: string;
  /** ISO date. Must be in the past – upcoming work belongs in Drives. */
  happenedOn: string;
  locationLabel?: string;
  city?: string;
  treesPlanted?: number;
  volunteersInvolved?: number;
  partnerOrgs?: string;
  sortOrder?: number;
  photos?: PickedPhoto[];
  /** Update only: ids of already-stored photos to delete (new `photos` are appended). */
  removeMediaIds?: string[];
}

/** Text fields an edit may blank out; numbers can't be cleared over multipart so they never are. */
const CLEARABLE_TEXT = ['description', 'locationLabel', 'city', 'partnerOrgs'];

function toForm(input: Partial<PortfolioInput>, isUpdate = false): FormData {
  const form = new FormData();
  const scalar: [string, unknown][] = [
    ['title', input.title],
    ['description', input.description],
    ['happenedOn', input.happenedOn],
    ['locationLabel', input.locationLabel],
    ['city', input.city],
    ['treesPlanted', input.treesPlanted],
    ['volunteersInvolved', input.volunteersInvolved],
    ['partnerOrgs', input.partnerOrgs],
    ['sortOrder', input.sortOrder],
  ];
  for (const [key, value] of scalar) {
    if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    else if (isUpdate && value === '' && CLEARABLE_TEXT.includes(key)) form.append(key, '');
  }
  if (input.removeMediaIds?.length) form.append('removeMediaIds', JSON.stringify(input.removeMediaIds));
  for (const photo of input.photos ?? []) {
    form.append('photos', toFormFile(photo.uri), photo.name);
  }
  return form;
}

export async function fetchMyPortfolio(cursor?: string): Promise<Page<ApiPortfolioEntry>> {
  return apiFetch<Page<ApiPortfolioEntry>>(pagedPath('/api/ngo/portfolio', cursor));
}

export async function fetchNgoPortfolio(ngoId: string): Promise<ApiPortfolioEntry[]> {
  return apiFetch<ApiPortfolioEntry[]>(`/api/ngos/${ngoId}/portfolio`);
}

export async function createPortfolioEntry(input: PortfolioInput): Promise<ApiPortfolioEntry> {
  return apiFetch<ApiPortfolioEntry>('/api/ngo/portfolio', {
    method: 'POST',
    body: toForm(input),
    isForm: true,
  });
}

/**
 * Photos are edited incrementally: `photos` are appended and `removeMediaIds` deleted; leaving
 * both out keeps the photos as they are.
 */
export async function updatePortfolioEntry(
  id: string,
  input: Partial<PortfolioInput>,
): Promise<ApiPortfolioEntry> {
  return apiFetch<ApiPortfolioEntry>(`/api/ngo/portfolio/${id}`, {
    method: 'PATCH',
    body: toForm(input, true),
    isForm: true,
  });
}

export async function deletePortfolioEntry(id: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/portfolio/${id}`, { method: 'DELETE' });
}

export interface PortfolioLikeResult {
  liked: boolean;
  likeCount: number;
}

export async function likePortfolioEntry(id: string): Promise<PortfolioLikeResult> {
  return apiFetch<PortfolioLikeResult>(`/api/portfolio/${id}/like`, { method: 'POST' });
}

export async function unlikePortfolioEntry(id: string): Promise<PortfolioLikeResult> {
  return apiFetch<PortfolioLikeResult>(`/api/portfolio/${id}/like`, { method: 'DELETE' });
}
