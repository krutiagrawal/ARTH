import { apiFetch, toFormBlob } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';

export type NgoOrgTypeValue = 'trust' | 'society' | 'section8_company' | 'registered_nonprofit' | 'other';

export interface NgoOfficeBearerApi {
  name: string;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
}

// Everything an NGO filled in at registration beyond the basics – returned by GET /api/ngo/profile and
// editable from the NGO profile screen (legal fields lock once approved; see ngo.service.ts).
export interface NgoRegistrationDetails {
  orgType?: NgoOrgTypeValue | null;
  line1?: string | null;
  operatingCities?: string[];
  operatingStates?: string[];
  officialEmail?: string | null;
  socialMediaLinks?: string[];

  registrationNumber?: string | null;
  registrationAuthority?: string | null;
  panNumber?: string | null;
  ngoDarpanId?: string | null;
  twelveARegistrationNumber?: string | null;
  eightyGRegistrationNumber?: string | null;
  fcraRegistrationNumber?: string | null;
  csr1RegistrationNumber?: string | null;

  primaryContactName?: string | null;
  primaryContactDesignation?: string | null;
  primaryContactPhone?: string | null;
  primaryContactEmail?: string | null;
  officeBearers?: NgoOfficeBearerApi[];

  primaryWorkAreas?: string[];
  drivesConductedHistorical?: number | null;
  treesPlantedHistorical?: number | null;
  majorProjectsDescription?: string | null;
  environmentalWorkSinceYear?: number | null;

  conductsPlantationDrives?: boolean | null;
  typicalSaplingsPerDrive?: string | null;
  typicalDriveLocations?: string | null;
  speciesCommonlyPlanted?: string | null;
  saplingSourceDescription?: string | null;
  monitorsSurvivalPostPlanting?: boolean | null;
  doesPostPlantationMaintenance?: boolean | null;
  plantationVerificationMethod?: string | null;
  previousProjectLinks?: string[];

  driveReportLinks?: string[];
  mediaCoverageLinks?: string[];
  projectPageLinks?: string[];
  annualReportLinks?: string[];
  impactReportLinks?: string[];
  socialMediaPostLinks?: string[];

  arthUsageGoals?: string[];
  expectedDrivesPerYear?: number | null;
  participantTypes?: string[];
}

export interface Award {
  title: string;
  year?: number;
  issuer?: string;
}

export type NgoDocumentType =
  | 'registration_certificate'
  | 'twelve_a_certificate'
  | 'eighty_g_certificate'
  | 'fcra_certificate'
  | 'csr1_certificate'
  | 'authorization_proof'
  | 'past_work_photo';

export interface ApiNgoDocument {
  id: string;
  docType: NgoDocumentType;
  fileUrl: string;
  uploadedAt: string;
}

export interface ApiNgoProfile extends NgoRegistrationDetails {
  /** Verification documents uploaded at registration (own profile only). */
  documents?: ApiNgoDocument[];
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

// Text/list fields the edit screen sends. Lists are always sent when present (an empty list clears it).
type TextKeys =
  | 'line1' | 'officialEmail' | 'registrationNumber' | 'registrationAuthority' | 'panNumber' | 'ngoDarpanId'
  | 'twelveARegistrationNumber' | 'eightyGRegistrationNumber' | 'fcraRegistrationNumber' | 'csr1RegistrationNumber'
  | 'primaryContactName' | 'primaryContactDesignation' | 'primaryContactPhone' | 'primaryContactEmail'
  | 'majorProjectsDescription' | 'typicalSaplingsPerDrive' | 'typicalDriveLocations' | 'speciesCommonlyPlanted'
  | 'saplingSourceDescription' | 'plantationVerificationMethod' | 'orgType';
type NumberKeys = 'drivesConductedHistorical' | 'treesPlantedHistorical' | 'environmentalWorkSinceYear' | 'expectedDrivesPerYear';
type BoolKeys = 'conductsPlantationDrives' | 'monitorsSurvivalPostPlanting' | 'doesPostPlantationMaintenance';
type CommaListKeys = 'operatingCities' | 'operatingStates' | 'primaryWorkAreas' | 'arthUsageGoals' | 'participantTypes';
type LinkListKeys =
  | 'socialMediaLinks' | 'previousProjectLinks' | 'driveReportLinks' | 'mediaCoverageLinks' | 'projectPageLinks'
  | 'annualReportLinks' | 'impactReportLinks' | 'socialMediaPostLinks';

const TEXT_KEYS: TextKeys[] = [
  'line1', 'officialEmail', 'registrationNumber', 'registrationAuthority', 'panNumber', 'ngoDarpanId',
  'twelveARegistrationNumber', 'eightyGRegistrationNumber', 'fcraRegistrationNumber', 'csr1RegistrationNumber',
  'primaryContactName', 'primaryContactDesignation', 'primaryContactPhone', 'primaryContactEmail',
  'majorProjectsDescription', 'typicalSaplingsPerDrive', 'typicalDriveLocations', 'speciesCommonlyPlanted',
  'saplingSourceDescription', 'plantationVerificationMethod', 'orgType',
];
const NUMBER_KEYS: NumberKeys[] = ['drivesConductedHistorical', 'treesPlantedHistorical', 'environmentalWorkSinceYear', 'expectedDrivesPerYear'];
const BOOL_KEYS: BoolKeys[] = ['conductsPlantationDrives', 'monitorsSurvivalPostPlanting', 'doesPostPlantationMaintenance'];
const COMMA_LIST_KEYS: CommaListKeys[] = ['operatingCities', 'operatingStates', 'primaryWorkAreas', 'arthUsageGoals', 'participantTypes'];
const LINK_LIST_KEYS: LinkListKeys[] = [
  'socialMediaLinks', 'previousProjectLinks', 'driveReportLinks', 'mediaCoverageLinks', 'projectPageLinks',
  'annualReportLinks', 'impactReportLinks', 'socialMediaPostLinks',
];

export interface UpdateNgoProfileInput extends
  Partial<Record<TextKeys, string>>,
  Partial<Record<NumberKeys, number>>,
  Partial<Record<BoolKeys, boolean>>,
  Partial<Record<CommaListKeys, string[]>>,
  Partial<Record<LinkListKeys, string[]>> {
  officeBearers?: NgoOfficeBearerApi[];
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
  for (const key of TEXT_KEYS) {
    const value = input[key];
    // Emails/phones can't be cleared with '' (the API validates their format), so only non-empty ones are sent.
    if (value !== undefined && (value !== '' || !/email|phone/i.test(key))) form.append(key, value);
  }
  for (const key of NUMBER_KEYS) if (input[key] !== undefined) form.append(key, String(input[key]));
  for (const key of BOOL_KEYS) if (input[key] !== undefined) form.append(key, String(input[key]));
  for (const key of COMMA_LIST_KEYS) if (input[key] !== undefined) form.append(key, input[key]!.join(','));
  for (const key of LINK_LIST_KEYS) if (input[key] !== undefined) form.append(key, JSON.stringify(input[key]));
  if (input.officeBearers !== undefined) form.append('officeBearers', JSON.stringify(input.officeBearers));
  if (input.logo) {
    form.append('logo', await toFormBlob(input.logo.uri, input.logo.type, 'Logo'), input.logo.name);
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
  treesPlanted: number;
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

/** Cancels this person's confirmed RSVPs to the NGO's *upcoming* drives only – past attendance
 * history is untouched, so someone whose only participation was in the past will still show up
 * here afterward. */
export async function removeNgoVolunteer(userId: string): Promise<{ cancelledCount: number }> {
  return apiFetch<{ cancelledCount: number }>(`/api/ngo/volunteers/${userId}`, { method: 'DELETE' });
}

/** Uploads/replaces one verification document. Legal documents are refused once the NGO is approved. */
export async function uploadNgoDocument(docType: NgoDocumentType, file: { uri: string; name: string; type: string }): Promise<ApiNgoProfile> {
  const form = new FormData();
  form.append('docType', docType);
  form.append('file', await toFormBlob(file.uri, file.type, 'Document'), file.name);
  return apiFetch<ApiNgoProfile>('/api/ngo/profile/documents', { method: 'POST', body: form, isForm: true });
}

export async function deleteNgoDocument(id: string): Promise<ApiNgoProfile> {
  return apiFetch<ApiNgoProfile>(`/api/ngo/profile/documents/${id}`, { method: 'DELETE' });
}
