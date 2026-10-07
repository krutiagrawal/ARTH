import { apiFetch, toFormFile } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';

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
  /** Estimated from each tree's species and age. */
  co2AbsorptionKg: number;
  oxygenKg?: number;
  impactTreesCounted?: number;
  impactConfidence?: 'medium' | 'low';
  activity: unknown[];
  trustScore: number | null;
  growthLevel: 'seedling' | 'growing' | 'established' | 'evergreen';
}

export async function fetchNgoStats(): Promise<ApiNgoStats> {
  return apiFetch<ApiNgoStats>('/api/ngo/stats');
}

export interface MonthlyBucket {
  month: string;
  /** "YYYY-MM", for passing back into fetchNgoMonthlyRsvps etc. to drill into that month. */
  monthKey: string;
  count: number;
}

export interface ApiNgoReports extends ApiNgoStats {
  survival: {
    total: number;
    survivalRate: number;
    counts: Record<'not_checked' | 'healthy' | 'struggling' | 'dead' | 'removed', number>;
  };
  attendance: { recorded: number; rate: number | null };
  sponsoredTrees: { count: number; totalAmountCents: number };
  monthly: {
    donations: MonthlyBucket[];
    rsvps: MonthlyBucket[];
    adoptions: MonthlyBucket[];
  };
}

export async function fetchNgoReports(): Promise<ApiNgoReports> {
  return apiFetch<ApiNgoReports>('/api/ngo/reports');
}

export interface ApiMonthlyRsvp {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  driveId: string;
  driveTitle: string;
  createdAt: string;
}

/** RSVPs behind one bar of the Reports page's "RSVPs (6 months)" chart. `month` is a "YYYY-MM"
 * monthKey from ApiNgoReports.monthly.rsvps. */
export async function fetchNgoMonthlyRsvps(month: string): Promise<ApiMonthlyRsvp[]> {
  return apiFetch<ApiMonthlyRsvp[]>(`/api/ngo/rsvps?month=${encodeURIComponent(month)}`);
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

export async function fetchNgoVolunteers(cursor?: string): Promise<Page<ApiVolunteer>> {
  return apiFetch<Page<ApiVolunteer>>(pagedPath('/api/ngo/volunteers', cursor, {}, 30));
}

/** Cancels this person's confirmed RSVPs to the NGO's *upcoming* drives only — past attendance
 * history is untouched, so someone whose only participation was in the past will still show up
 * here afterward. */
export async function removeNgoVolunteer(userId: string): Promise<{ cancelledCount: number }> {
  return apiFetch<{ cancelledCount: number }>(`/api/ngo/volunteers/${userId}`, { method: 'DELETE' });
}
