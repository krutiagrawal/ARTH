import { apiFetch, toFormFile } from './client';
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
  media: ApiPortfolioMedia[];
  createdAt: string;
}

export interface PortfolioInput {
  title: string;
  description?: string;
  /** ISO date. Must be in the past — upcoming work belongs in Drives. */
  happenedOn: string;
  locationLabel?: string;
  city?: string;
  treesPlanted?: number;
  volunteersInvolved?: number;
  partnerOrgs?: string;
  sortOrder?: number;
  photos?: PickedPhoto[];
}

function toForm(input: Partial<PortfolioInput>): FormData {
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
  }
  for (const photo of input.photos ?? []) {
    form.append('photos', toFormFile(photo.uri), photo.name);
  }
  return form;
}

export async function fetchMyPortfolio(): Promise<ApiPortfolioEntry[]> {
  return apiFetch<ApiPortfolioEntry[]>('/api/ngo/portfolio');
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
 * Photos are replaced wholesale when `photos` is supplied and left alone when it is omitted —
 * so an edit that only changes the title must not pass an empty array.
 */
export async function updatePortfolioEntry(
  id: string,
  input: Partial<PortfolioInput>,
): Promise<ApiPortfolioEntry> {
  return apiFetch<ApiPortfolioEntry>(`/api/ngo/portfolio/${id}`, {
    method: 'PATCH',
    body: toForm(input),
    isForm: true,
  });
}

export async function deletePortfolioEntry(id: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/portfolio/${id}`, { method: 'DELETE' });
}
