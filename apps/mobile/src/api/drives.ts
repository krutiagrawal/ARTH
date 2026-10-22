import { apiFetch, toFormFile, type OwnedListSummary, type OwnedExport } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';

export interface ApiDrivePickupPoint {
  id: string;
  address: string;
  arrivalBy: string;
  order: number;
}

export interface ApiDrivePlant {
  id: string;
  speciesName: string;
  priceCents: number;
  sponsoredCount: number;
}

export interface ApiDrive {
  id: string;
  ngoId: string;
  ngoName: string;
  title: string;
  description: string;
  instructions: string | null;
  photoUri: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  transportMode: 'self_arrange' | 'ngo_provided';
  pickupPoints: ApiDrivePickupPoint[];
  plants: ApiDrivePlant[];
  startsAt: string;
  durationMinutes: number | null;
  capacity: number | null;
  confirmedCount: number;
  status: 'upcoming' | 'cancelled' | 'completed';
  /** Why the NGO cancelled the drive (only set when status is 'cancelled'). */
  cancelReason?: string | null;
  /** Set on a cancelled drive once it has been relaunched - the id of its replacement. */
  relaunchedToId?: string | null;
  whatToBring?: string | null;
  providedByNgo?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  minAge?: number | null;
  effortLevel?: DriveEffortLevel | null;
  /** A few confirmed volunteers' avatars (no names) - only on the single-drive response. */
  goingPreview?: { avatarEmoji: string; avatarUrl: string | null }[];
  /** Server-computed: marked completed, or its scheduled end has passed. Locked for RSVP/sponsoring. */
  hasEnded?: boolean;
  isRsvped?: boolean;
  featured: boolean;
  /** Hidden from the NGO's own Manage list unless the Archived filter is on. */
  isArchived?: boolean;
  distanceKm?: number;
}

export async function fetchDrives(params: { lat?: number; lng?: number; ngoId?: string; includePast?: boolean } = {}): Promise<ApiDrive[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.ngoId) query.set('ngoId', params.ngoId);
  if (params.includePast) query.set('includePast', 'true');
  const qs = query.toString();
  return apiFetch<ApiDrive[]>(`/api/drives${qs ? `?${qs}` : ''}`);
}

export async function fetchDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}`);
}

export interface DriveRsvpInput {
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  /** null = the volunteer is making their own way (ngo_provided drives only). */
  pickupPointId: string | null;
  note?: string;
  confirmed: true;
}

export async function joinDrive(id: string, input: DriveRsvpInput): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/rsvp`, { method: 'POST', body: input });
}

export type RsvpCancelReason = 'schedule_clash' | 'unwell' | 'transport' | 'changed_mind' | 'other';

export async function leaveDrive(id: string, input: { reason: RsvpCancelReason; note?: string }): Promise<void> {
  await apiFetch<void>(`/api/drives/${id}/rsvp`, { method: 'DELETE', body: input });
}

// clientSecret is null when the backend has no Stripe key configured (local/dev only – see
// drive.service.ts's sponsorPlant()) – the sponsorship comes back already succeeded and there's
// no payment sheet to present.
export async function sponsorPlant(driveId: string, plantId: string): Promise<{ sponsorshipId: string; clientSecret: string | null }> {
  return apiFetch(`/api/drives/${driveId}/plants/${plantId}/sponsor`, { method: 'POST' });
}

export async function fetchJoinedDrives(): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>('/api/drives/joined');
}

export interface ApiMySponsorship {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  amountCents: number;
  currency: string;
  sponsoredAt: string;
  speciesName: string;
  driveId: string;
  driveTitle: string;
  ngoName: string;
}

export interface MySponsorshipsFilter {
  q?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  sort?: 'newest' | 'oldest' | 'amount';
}

export async function fetchMySponsorships(cursor?: string, filter: MySponsorshipsFilter = {}): Promise<Page<ApiMySponsorship>> {
  return apiFetch<Page<ApiMySponsorship>>(pagedPath('/api/drives/sponsorships/mine', cursor, { q: filter.q, status: filter.status, sort: filter.sort }));
}

export async function fetchMySponsorshipsSummary(): Promise<OwnedListSummary> {
  return apiFetch<OwnedListSummary>('/api/drives/sponsorships/mine/summary');
}
export async function exportMySponsorships(): Promise<OwnedExport> {
  return apiFetch<OwnedExport>('/api/drives/sponsorships/mine/export');
}

export interface ApiSponsorHealthRollup {
  driveCount: number;
  totalTrees: number;
  counts: { not_checked: number; healthy: number; struggling: number; dead: number; removed: number };
}

// Real PlantedTree health outcomes across every drive the user has sponsored – an aggregate,
// not a per-sponsorship attribution (a sponsorship funds a catalog slot/drive, not one specific
// physical tree).
export async function fetchSponsorHealthRollup(): Promise<ApiSponsorHealthRollup> {
  return apiFetch<ApiSponsorHealthRollup>('/api/drives/sponsorships/mine/health-rollup');
}

export interface ApiDriveTreeSummary {
  total: number;
  counts: { not_checked: number; healthy: number; struggling: number; dead: number; removed: number };
  survivalRate: number;
  lastCheckedAt: string | null;
}

// Real per-drive tree-identification/health breakdown – every logged tree already has its own
// identity (a publicId), this just surfaces the real counts, viewable by anyone who can see the
// drive (attendee, sponsor), not NGO-owner-only.
export async function fetchDriveTreeSummary(driveId: string): Promise<ApiDriveTreeSummary> {
  return apiFetch<ApiDriveTreeSummary>(`/api/drives/${driveId}/tree-summary`);
}

export async function fetchUserJoinedDrives(userId: string): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>(`/api/users/${userId}/drives/joined`);
}

export async function fetchGroupDrives(groupId: string): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>(`/api/groups/${groupId}/drives`);
}

// ---------- NGO-facing ----------

export function ownedQuery(page: number | undefined, take: number | undefined, filter: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (page) {
    params.set('page', String(page));
    params.set('take', String(take ?? 30));
  }
  for (const [k, v] of Object.entries(filter)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export type OwnedDriveStatus = 'upcoming' | 'ended' | 'completed' | 'cancelled';

export interface OwnedDriveFilter {
  q?: string;
  status?: OwnedDriveStatus;
  archived?: boolean;
  sort?: 'newest' | 'oldest' | 'soonest';
  from?: string;
  to?: string;
}

export async function fetchMyDrives(page?: number, take?: number, filter: OwnedDriveFilter = {}): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>(`/api/drives/mine${ownedQuery(page, take, { ...filter, archived: filter.archived ? 'true' : undefined })}`);
}

/** Cancels a drive the NGO organizes (e.g. rained out) – RSVPs stay recorded, the drive just
 * stops accepting new ones and shows as cancelled everywhere it's listed. */
export async function cancelDrive(id: string, reason: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}`, { method: 'DELETE', body: { reason } });
}

/** Marks a drive completed, unlocking the attendance-checkoff UI on its detail screen. */
export async function completeDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/complete`, { method: 'POST' });
}

export async function setDriveFeatured(id: string, featured: boolean): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/feature`, { method: 'POST', body: { featured } });
}

export interface CreateDrivePickupPointInput {
  address: string;
  arrivalBy: string; // ISO datetime
}

export interface CreateDrivePlantInput {
  speciesName: string;
  priceCents: number;
}

export type DriveEffortLevel = 'easy' | 'moderate' | 'strenuous';

export interface CreateDriveInput {
  title: string;
  description: string;
  instructions?: string;
  address: string;
  city: string;
  transportMode: 'self_arrange' | 'ngo_provided';
  pickupPoints?: CreateDrivePickupPointInput[];
  plants?: CreateDrivePlantInput[];
  startsAt: string; // ISO datetime
  durationMinutes?: number;
  capacity?: number;
  whatToBring?: string;
  providedByNgo?: string;
  contactName?: string;
  contactPhone?: string;
  /** null clears it on update. */
  minAge?: number | null;
  effortLevel?: DriveEffortLevel | null;
  photo?: { uri: string; name: string; type: string };
}

export interface ApiDriveAttendee {
  id: string;
  name: string;
  handle: string;
  rsvpedAt: string;
  attended: boolean | null;
  hoursLogged: number | null;
  role: string | null;
  /** Null for RSVPs made before the confirm form existed. */
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  note?: string | null;
  /** Null on an ngo_provided drive = coming by themselves. */
  pickupPoint?: { id: string; address: string } | null;
}

export async function fetchDriveAttendees(driveId: string): Promise<{ total: number; attendees: ApiDriveAttendee[] }> {
  return apiFetch(`/api/drives/${driveId}/attendees?take=50`);
}

export interface ApiDrivePlantSponsor {
  id: string;
  name: string;
  handle: string;
  amountCents: number;
  sponsoredAt: string;
}

export interface ApiDrivePlantSponsors {
  id: string;
  speciesName: string;
  priceCents: number;
  sponsors: ApiDrivePlantSponsor[];
}

/** Owner-only – the NGO can't sponsor its own drive (see sponsorPlant server-side), so its own
 * detail screen shows this instead of a "Sponsor" button. */
export async function fetchDriveSponsors(driveId: string): Promise<{ plants: ApiDrivePlantSponsors[] }> {
  return apiFetch(`/api/drives/${driveId}/sponsors`);
}

export async function setDriveRsvpAttendance(
  driveId: string,
  rsvpId: string,
  input: { attended?: boolean; hoursLogged?: number | null; role?: string | null },
): Promise<{ id: string; attended: boolean | null; hoursLogged: number | null; role: string | null }> {
  return apiFetch(`/api/drives/${driveId}/attendees/${rsvpId}`, { method: 'PATCH', body: input });
}

export async function createDrive(input: CreateDriveInput): Promise<ApiDrive> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('description', input.description);
  if (input.instructions) form.append('instructions', input.instructions);
  form.append('address', input.address);
  form.append('city', input.city);
  form.append('transportMode', input.transportMode);
  if (input.pickupPoints?.length) form.append('pickupPoints', JSON.stringify(input.pickupPoints));
  if (input.plants?.length) form.append('plants', JSON.stringify(input.plants));
  form.append('startsAt', input.startsAt);
  if (input.durationMinutes) form.append('durationMinutes', String(input.durationMinutes));
  if (input.capacity) form.append('capacity', String(input.capacity));
  if (input.whatToBring) form.append('whatToBring', input.whatToBring);
  if (input.providedByNgo) form.append('providedByNgo', input.providedByNgo);
  if (input.contactName) form.append('contactName', input.contactName);
  if (input.contactPhone) form.append('contactPhone', input.contactPhone);
  if (input.minAge) form.append('minAge', String(input.minAge));
  if (input.effortLevel) form.append('effortLevel', input.effortLevel);
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiDrive>('/api/drives', { method: 'POST', body: form, isForm: true });
}

export type UpdateDriveInput = Partial<CreateDriveInput>;

/** `plants` are appended on the server (paid sponsorships hang off existing ones), never replaced. */
export async function updateDrive(id: string, input: UpdateDriveInput): Promise<ApiDrive> {
  const form = new FormData();
  if (input.title !== undefined) form.append('title', input.title);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.instructions !== undefined) form.append('instructions', input.instructions);
  if (input.address !== undefined) form.append('address', input.address);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.transportMode !== undefined) form.append('transportMode', input.transportMode);
  if (input.pickupPoints !== undefined) form.append('pickupPoints', JSON.stringify(input.pickupPoints));
  if (input.plants?.length) form.append('plants', JSON.stringify(input.plants));
  if (input.startsAt !== undefined) form.append('startsAt', input.startsAt);
  if (input.durationMinutes) form.append('durationMinutes', String(input.durationMinutes));
  if (input.capacity) form.append('capacity', String(input.capacity));
  // On edit an emptied field must clear the stored value, so '' is sent rather than skipped.
  if (input.whatToBring !== undefined) form.append('whatToBring', input.whatToBring);
  if (input.providedByNgo !== undefined) form.append('providedByNgo', input.providedByNgo);
  if (input.contactName !== undefined) form.append('contactName', input.contactName);
  if (input.contactPhone !== undefined) form.append('contactPhone', input.contactPhone);
  if (input.minAge !== undefined) form.append('minAge', input.minAge == null ? '' : String(input.minAge));
  if (input.effortLevel !== undefined) form.append('effortLevel', input.effortLevel ?? '');
  if (input.photo) form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  return apiFetch<ApiDrive>(`/api/drives/${id}`, { method: 'PATCH', body: form, isForm: true });
}

/** Permanent delete – the server refuses while RSVPs, sponsorships or linked trees exist (cancel instead). */
export async function deleteDrive(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/drives/${id}/permanent`, { method: 'DELETE' });
}

export async function fetchOwnedDriveSummary(): Promise<OwnedListSummary> {
  return apiFetch<OwnedListSummary>('/api/drives/mine/summary');
}
export async function exportOwnedDrives(): Promise<OwnedExport> {
  return apiFetch<OwnedExport>('/api/drives/mine/export');
}
export async function duplicateDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/duplicate`, { method: 'POST' });
}
export async function relaunchDrive(id: string, input: { startsAt: string; notifyPrevious: boolean }): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/relaunch`, { method: 'POST', body: input });
}
export async function archiveDrive(id: string, archived: boolean): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/archive`, { method: 'POST', body: { archived } });
}
