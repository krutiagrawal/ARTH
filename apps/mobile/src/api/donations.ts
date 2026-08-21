import { apiFetch } from './client';

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

export async function fetchCampaigns(): Promise<ApiCampaign[]> {
  return apiFetch<ApiCampaign[]>('/api/campaigns');
}

export async function fetchCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}`);
}

export interface DonationIntent {
  donationId: string;
  clientSecret: string;
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
    form.append('photo', { uri: input.photo.uri, name: input.photo.name, type: input.photo.type } as unknown as Blob);
  }
  return apiFetch<ApiCampaign>('/api/campaigns', { method: 'POST', body: form, isForm: true });
}

export async function closeCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}`, { method: 'DELETE' });
}

export async function reopenCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}/reopen`, { method: 'POST' });
}
