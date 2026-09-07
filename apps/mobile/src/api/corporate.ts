import { apiFetch, toFormFile } from './client';

export interface ApiCorporateProfile {
  id: string;
  companyName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
  industry: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  streakCurrent: number;
  streakMax: number;
  badgesCount: number;
  createdAt: string;
}

export interface UpdateCorporateProfileInput {
  companyName?: string;
  description?: string;
  city?: string;
  industry?: string;
  logo?: { uri: string; name: string; type: string };
}

export async function fetchCorporateProfile(): Promise<ApiCorporateProfile> {
  return apiFetch<ApiCorporateProfile>('/api/corporate/profile');
}

export async function updateCorporateProfile(input: UpdateCorporateProfileInput): Promise<ApiCorporateProfile> {
  const form = new FormData();
  if (input.companyName !== undefined) form.append('companyName', input.companyName);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.industry !== undefined) form.append('industry', input.industry);
  if (input.logo) {
    form.append('logo', toFormFile(input.logo.uri), input.logo.name);
  }
  return apiFetch<ApiCorporateProfile>('/api/corporate/profile', { method: 'PATCH', body: form, isForm: true });
}

export async function resubmitCorporateProfile(): Promise<ApiCorporateProfile> {
  return apiFetch<ApiCorporateProfile>('/api/corporate/resubmit', { method: 'POST' });
}

export interface ApiCorporateStats {
  sponsorshipCount: number;
  totalSponsoredCents: number;
}

export async function fetchCorporateStats(): Promise<ApiCorporateStats> {
  return apiFetch<ApiCorporateStats>('/api/corporate/stats');
}

export interface ApiCsrSponsorship {
  id: string;
  corporateId: string;
  driveId: string | null;
  amountCents: number;
  note: string | null;
  createdAt: string;
  drive?: { id: string; title: string } | null;
}

export interface CreateSponsorshipInput {
  driveId?: string;
  amountCents: number;
  note?: string;
}

export async function fetchSponsorships(): Promise<ApiCsrSponsorship[]> {
  return apiFetch<ApiCsrSponsorship[]>('/api/corporate/sponsorships');
}

export async function createSponsorship(input: CreateSponsorshipInput): Promise<ApiCsrSponsorship> {
  return apiFetch<ApiCsrSponsorship>('/api/corporate/sponsorships', { method: 'POST', body: input });
}

export async function deleteSponsorship(id: string): Promise<void> {
  await apiFetch(`/api/corporate/sponsorships/${id}`, { method: 'DELETE' });
}
