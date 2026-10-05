import { apiFetch, toFormFile } from './client';

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
  isRsvped?: boolean;
  featured: boolean;
  distanceKm?: number;
}

export async function fetchDrives(params: { lat?: number; lng?: number; ngoId?: string } = {}): Promise<ApiDrive[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
  if (params.ngoId) query.set('ngoId', params.ngoId);
  const qs = query.toString();
  return apiFetch<ApiDrive[]>(`/api/drives${qs ? `?${qs}` : ''}`);
}

export async function fetchDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}`);
}

export async function joinDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}/rsvp`, { method: 'POST' });
}

export async function leaveDrive(id: string): Promise<void> {
  await apiFetch<void>(`/api/drives/${id}/rsvp`, { method: 'DELETE' });
}

// clientSecret is null when the backend has no Stripe key configured (local/dev only — see
// drive.service.ts's sponsorPlant()) — the sponsorship comes back already succeeded and there's
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

export async function fetchMySponsorships(): Promise<ApiMySponsorship[]> {
  return apiFetch<ApiMySponsorship[]>('/api/drives/sponsorships/mine');
}

export interface ApiSponsorHealthRollup {
  driveCount: number;
  totalTrees: number;
  counts: { not_checked: number; healthy: number; struggling: number; dead: number; removed: number };
}

// Real PlantedTree health outcomes across every drive the user has sponsored — an aggregate,
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

// Real per-drive tree-identification/health breakdown — every logged tree already has its own
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

export async function fetchMyDrives(): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>('/api/drives/mine');
}

/** Cancels a drive the NGO organizes (e.g. rained out) — RSVPs stay recorded, the drive just
 * stops accepting new ones and shows as cancelled everywhere it's listed. */
export async function cancelDrive(id: string): Promise<ApiDrive> {
  return apiFetch<ApiDrive>(`/api/drives/${id}`, { method: 'DELETE' });
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

/** Owner-only — the NGO can't sponsor its own drive (see sponsorPlant server-side), so its own
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
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }

  return apiFetch<ApiDrive>('/api/drives', { method: 'POST', body: form, isForm: true });
}
