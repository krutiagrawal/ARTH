import { apiFetch } from './client';

export interface ApiNurseryProfile {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
  contactPhone: string | null;
  lat: number | string | null;
  lng: number | string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  streakCurrent: number;
  streakMax: number;
  badgesCount: number;
  createdAt: string;
}

export interface UpdateNurseryProfileInput {
  nurseryName?: string;
  description?: string;
  city?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  logo?: { uri: string; name: string; type: string };
}

export async function fetchNurseryProfile(): Promise<ApiNurseryProfile> {
  return apiFetch<ApiNurseryProfile>('/api/nursery/profile');
}

export async function updateNurseryProfile(input: UpdateNurseryProfileInput): Promise<ApiNurseryProfile> {
  const form = new FormData();
  if (input.nurseryName !== undefined) form.append('nurseryName', input.nurseryName);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.contactPhone !== undefined) form.append('contactPhone', input.contactPhone);
  if (input.lat !== undefined) form.append('lat', String(input.lat));
  if (input.lng !== undefined) form.append('lng', String(input.lng));
  if (input.logo) {
    form.append('logo', { uri: input.logo.uri, name: input.logo.name, type: input.logo.type } as unknown as Blob);
  }
  return apiFetch<ApiNurseryProfile>('/api/nursery/profile', { method: 'PATCH', body: form, isForm: true });
}

export async function resubmitNurseryProfile(): Promise<ApiNurseryProfile> {
  return apiFetch<ApiNurseryProfile>('/api/nursery/resubmit', { method: 'POST' });
}

export interface ApiNurseryStats {
  speciesCount: number;
  totalQuantity: number;
  freeSpeciesCount: number;
  streakCurrent: number;
  streakMax: number;
  badgesCount: number;
}

export async function fetchNurseryStats(): Promise<ApiNurseryStats> {
  return apiFetch<ApiNurseryStats>('/api/nursery/stats');
}

export interface ApiSaplingStock {
  id: string;
  nurseryId: string;
  species: string;
  quantity: number;
  isFree: boolean;
  priceCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaplingStockInput {
  species: string;
  quantity: number;
  isFree?: boolean;
  priceCents?: number;
}

export async function fetchSaplingStock(): Promise<ApiSaplingStock[]> {
  return apiFetch<ApiSaplingStock[]>('/api/nursery/stock');
}

export async function createSaplingStock(input: SaplingStockInput): Promise<ApiSaplingStock> {
  return apiFetch<ApiSaplingStock>('/api/nursery/stock', { method: 'POST', body: input });
}

export async function updateSaplingStock(id: string, input: Partial<SaplingStockInput>): Promise<ApiSaplingStock> {
  return apiFetch<ApiSaplingStock>(`/api/nursery/stock/${id}`, { method: 'PATCH', body: input });
}

export async function deleteSaplingStock(id: string): Promise<void> {
  await apiFetch(`/api/nursery/stock/${id}`, { method: 'DELETE' });
}

export interface ApiNurseryBadge {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteriaTarget: number | null;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export async function fetchNurseryBadges(): Promise<ApiNurseryBadge[]> {
  return apiFetch<ApiNurseryBadge[]>('/api/nursery/badges');
}

export type ReservationStatus = 'pending' | 'fulfilled' | 'declined' | 'cancelled';

export interface ApiNurseryReservation {
  id: string;
  stockId: string;
  quantity: number;
  status: ReservationStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  species?: string;
  requester?: { id: string; name: string; avatarEmoji: string };
}

export async function fetchNurseryReservations(status?: ReservationStatus): Promise<ApiNurseryReservation[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<ApiNurseryReservation[]>(`/api/nursery/reservations${query}`);
}

export async function fulfillReservation(id: string): Promise<ApiNurseryReservation> {
  return apiFetch<ApiNurseryReservation>(`/api/nursery/reservations/${id}/fulfill`, { method: 'POST' });
}

export async function declineReservation(id: string): Promise<ApiNurseryReservation> {
  return apiFetch<ApiNurseryReservation>(`/api/nursery/reservations/${id}/decline`, { method: 'POST' });
}

export interface ApiStockLedgerEntry {
  id: string;
  stockId: string | null;
  species: string;
  delta: number;
  reason: 'manual_add' | 'manual_adjust' | 'manual_remove' | 'reservation_fulfilled';
  createdAt: string;
}

export async function fetchStockLedger(page = 1, take = 30): Promise<ApiStockLedgerEntry[]> {
  return apiFetch<ApiStockLedgerEntry[]>(`/api/nursery/stock/ledger?page=${page}&take=${take}`);
}

export interface ApiStockAnalytics {
  totalAddedLifetime: number;
  totalGivenOutLifetime: number;
  reservationsFulfilled: number;
  currentSpeciesCount: number;
  currentTotalQuantity: number;
}

export async function fetchStockAnalytics(): Promise<ApiStockAnalytics> {
  return apiFetch<ApiStockAnalytics>('/api/nursery/stock/analytics');
}
