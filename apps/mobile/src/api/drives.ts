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
  distanceKm?: number;
}

export async function fetchDrives(params: { lat?: number; lng?: number } = {}): Promise<ApiDrive[]> {
  const query = new URLSearchParams();
  if (params.lat !== undefined) query.set('lat', String(params.lat));
  if (params.lng !== undefined) query.set('lng', String(params.lng));
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

export async function sponsorPlant(driveId: string, plantId: string): Promise<{ sponsorshipId: string; clientSecret: string }> {
  return apiFetch(`/api/drives/${driveId}/plants/${plantId}/sponsor`, { method: 'POST' });
}

export async function fetchJoinedDrives(): Promise<ApiDrive[]> {
  return apiFetch<ApiDrive[]>('/api/drives/joined');
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
