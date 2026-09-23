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
  status: 'active' | 'closed';
  createdAt: string;
}

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

export async function createDonationIntent(campaignId: string, amountCents: number): Promise<DonationIntent> {
  return apiFetch<DonationIntent>(`/api/campaigns/${campaignId}/donate`, {
    method: 'POST',
    body: { amountCents },
  });
}

// ---------- NGO-facing ----------

export async function fetchMyCampaigns(): Promise<ApiCampaign[]> {
  return apiFetch<ApiCampaign[]>('/api/campaigns/mine');
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmountCents?: number;
  photo?: { uri: string; name: string; type: string };
}

export async function createCampaign(input: CreateCampaignInput): Promise<ApiCampaign> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('description', input.description);
  if (input.goalAmountCents !== undefined) form.append('goalAmountCents', String(input.goalAmountCents));
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
