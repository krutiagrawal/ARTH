import { apiFetch, toFormFile } from './client';

export interface Award {
  title: string;
  year?: number;
  issuer?: string;
}

export interface ApiNgoProfile {
  id: string;
  orgName: string;
  description: string;
  website: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  city: string | null;
  foundedYear: number | null;
  volunteerCountEstimate: number | null;
  awards: Award[];
  /** 'open' = anyone follows instantly, 'approval' = each follow needs accepting. */
  followPolicy: 'open' | 'approval';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  createdAt: string;
}

export interface UpdateNgoProfileInput {
  orgName?: string;
  description?: string;
  website?: string;
  contactPhone?: string;
  city?: string;
  foundedYear?: number;
  volunteerCountEstimate?: number;
  awards?: Award[];
  followPolicy?: 'open' | 'approval';
  logo?: { uri: string; name: string; type: string };
}

export async function fetchNgoProfile(): Promise<ApiNgoProfile> {
  return apiFetch<ApiNgoProfile>('/api/ngo/profile');
}

export async function updateNgoProfile(input: UpdateNgoProfileInput): Promise<ApiNgoProfile> {
  const form = new FormData();
  if (input.orgName !== undefined) form.append('orgName', input.orgName);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.website !== undefined) form.append('website', input.website);
  if (input.contactPhone !== undefined) form.append('contactPhone', input.contactPhone);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.foundedYear !== undefined) form.append('foundedYear', String(input.foundedYear));
  if (input.volunteerCountEstimate !== undefined) form.append('volunteerCountEstimate', String(input.volunteerCountEstimate));
  if (input.awards !== undefined) form.append('awards', JSON.stringify(input.awards));
  if (input.followPolicy !== undefined) form.append('followPolicy', input.followPolicy);
  if (input.logo) {
    form.append('logo', toFormFile(input.logo.uri), input.logo.name);
  }
  return apiFetch<ApiNgoProfile>('/api/ngo/profile', { method: 'PATCH', body: form, isForm: true });
}

export async function resubmitNgoProfile(): Promise<ApiNgoProfile> {
  return apiFetch<ApiNgoProfile>('/api/ngo/resubmit', { method: 'POST' });
}

export interface ApiNgoStats {
  activeCampaigns: number;
  upcomingDrives: number;
  totalRsvps: number;
  treesAvailable: number;
  treesAdopted: number;
  totalRaisedCents: number;
  communitiesReached: number;
  volunteersInvolved: number;
  totalDrives: number;
  co2AbsorptionKg: number;
  activity: unknown[];
}

export async function fetchNgoStats(): Promise<ApiNgoStats> {
  return apiFetch<ApiNgoStats>('/api/ngo/stats');
}

export interface ApiNgoReports extends ApiNgoStats {
  monthly: {
    donations: { month: string; count: number }[];
    rsvps: { month: string; count: number }[];
    adoptions: { month: string; count: number }[];
  };
}

export async function fetchNgoReports(): Promise<ApiNgoReports> {
  return apiFetch<ApiNgoReports>('/api/ngo/reports');
}

export interface ApiDonation {
  id: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
  campaignId: string;
  campaignTitle: string;
  donor: { name: string; handle: string };
}

export interface DonationsFilter {
  campaignId?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  take?: number;
}

export async function fetchNgoDonations(filter: DonationsFilter = {}): Promise<{ total: number; donations: ApiDonation[] }> {
  const query = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch(`/api/ngo/donations${qs ? `?${qs}` : ''}`);
}

export interface ApiDonationsSummaryRow {
  campaignId: string;
  campaignTitle: string;
  totalAmountCents: number;
  donationCount: number;
}

export async function fetchNgoDonationsSummary(): Promise<ApiDonationsSummaryRow[]> {
  return apiFetch<ApiDonationsSummaryRow[]>('/api/ngo/donations/summary');
}

export interface ApiVolunteer {
  userId: string;
  name: string;
  handle: string;
  drivesAttended: number;
  lastActiveAt: string | null;
}

export async function fetchNgoVolunteers(): Promise<ApiVolunteer[]> {
  return apiFetch<ApiVolunteer[]>('/api/ngo/volunteers');
}
