import { apiFetch, toFormFile } from './client';

export interface ApiCampaign {
  id: string;
  ngoId: string;
  ngoName: string;
  title: string;
  description: string;
  coverPhotoUri: string | null;
  goalAmountCents: number | null;
  raisedAmountCents: number;
  /** Portion of raisedAmountCents given by donors who chose to be anonymous. */
  anonymousRaisedCents: number;
  /** Distinct people who have donated. */
  donorCount: number;
  /** First names of the latest donors, newest first (max 3). */
  recentDonors: string[];
  category: CampaignCategory | null;
  /** ISO timestamp the campaign stops taking donations; null = open-ended. */
  endsAt: string | null;
  status: 'active' | 'closed';
  createdAt: string;
}

export const CAMPAIGN_CATEGORIES = [
  { key: 'planting', label: 'Planting', emoji: '🌳' },
  { key: 'restoration', label: 'Restoration', emoji: '🌿' },
  { key: 'awareness', label: 'Awareness', emoji: '📣' },
  { key: 'wildlife', label: 'Wildlife', emoji: '🦜' },
  { key: 'community', label: 'Community', emoji: '🤝' },
  { key: 'other', label: 'Other', emoji: '💚' },
] as const;
export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number]['key'];

export async function fetchCampaigns(params: { ngoId?: string } = {}): Promise<ApiCampaign[]> {
  const qs = params.ngoId ? `?ngoId=${params.ngoId}` : '';
  return apiFetch<ApiCampaign[]>(`/api/campaigns${qs}`);
}

export async function fetchCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}`);
}

// clientSecret is null when the backend has no Stripe key configured (local/dev only — see
// donation.service.ts's createDonationIntent()) — the donation comes back already succeeded and
// there's no payment sheet to present.
export interface DonationIntent {
  donationId: string;
  clientSecret: string | null;
}

export interface DonationExtras {
  /** Hide the donor's name from the public donor line (the NGO still sees it). */
  isAnonymous?: boolean;
  /** Optional note to the NGO (max 300 chars). */
  message?: string;
  /** Optional PAN printed on the receipt for 80G claims. */
  donorPan?: string;
}

export async function createDonationIntent(campaignId: string, amountCents: number, extras: DonationExtras = {}): Promise<DonationIntent> {
  return apiFetch<DonationIntent>(`/api/campaigns/${campaignId}/donate`, {
    method: 'POST',
    body: { amountCents, ...extras },
  });
}

export interface ApiMyDonation {
  id: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  donatedAt: string;
  campaignId: string;
  campaignTitle: string;
  ngoName: string;
}

export async function fetchMyDonations(params: { page?: number; take?: number } = {}): Promise<{ total: number; donations: ApiMyDonation[] }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.take) qs.set('take', String(params.take));
  return apiFetch(`/api/campaigns/mine-donations${qs.toString() ? `?${qs}` : ''}`);
}

// ---------- NGO-facing ----------

export async function fetchMyCampaigns(page?: number, take?: number): Promise<ApiCampaign[]> {
  return apiFetch<ApiCampaign[]>(`/api/campaigns/mine${page ? `?page=${page}&take=${take ?? 30}` : ''}`);
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmountCents?: number;
  category?: CampaignCategory;
  /** ISO timestamp. */
  endsAt?: string;
  photo?: { uri: string; name: string; type: string };
}

export async function createCampaign(input: CreateCampaignInput): Promise<ApiCampaign> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('description', input.description);
  if (input.goalAmountCents !== undefined) form.append('goalAmountCents', String(input.goalAmountCents));
  if (input.category) form.append('category', input.category);
  if (input.endsAt) form.append('endsAt', input.endsAt);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }
  return apiFetch<ApiCampaign>('/api/campaigns', { method: 'POST', body: form, isForm: true });
}

export async function closeCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}`, { method: 'DELETE' });
}

export async function reopenCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}/reopen`, { method: 'POST' });
}
