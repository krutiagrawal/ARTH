import { apiFetch } from './client';

export interface ApiNurseryProfile {
  id: string;
  nurseryName: string;
  description: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  city: string | null;
  contactPhone: string | null;
  lat: number | string | null;
  lng: number | string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  streakCurrent: number;
  streakMax: number;
  badgesCount: number;
  avgRating: number | string | null;
  reviewCount: number;
  offersDelivery: boolean;
  deliveryRadiusKm: number | null;
  followPolicy: 'open' | 'approval';
  createdAt: string;
}

export interface UpdateNurseryProfileInput {
  nurseryName?: string;
  description?: string;
  city?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  offersDelivery?: boolean;
  deliveryRadiusKm?: number;
  followPolicy?: 'open' | 'approval';
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
  if (input.offersDelivery !== undefined) form.append('offersDelivery', String(input.offersDelivery));
  if (input.deliveryRadiusKm !== undefined) form.append('deliveryRadiusKm', String(input.deliveryRadiusKm));
  if (input.followPolicy !== undefined) form.append('followPolicy', input.followPolicy);
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
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaplingStockInput {
  species: string;
  quantity: number;
  isFree?: boolean;
  priceCents?: number;
  photo?: { uri: string; name: string; type: string };
}

export async function fetchSaplingStock(): Promise<ApiSaplingStock[]> {
  return apiFetch<ApiSaplingStock[]>('/api/nursery/stock');
}

function stockToForm(input: Partial<SaplingStockInput>): FormData {
  const form = new FormData();
  if (input.species !== undefined) form.append('species', input.species);
  if (input.quantity !== undefined) form.append('quantity', String(input.quantity));
  if (input.isFree !== undefined) form.append('isFree', String(input.isFree));
  if (input.priceCents !== undefined) form.append('priceCents', String(input.priceCents));
  if (input.photo) {
    form.append('photo', { uri: input.photo.uri, name: input.photo.name, type: input.photo.type } as unknown as Blob);
  }
  return form;
}

export async function createSaplingStock(input: SaplingStockInput): Promise<ApiSaplingStock> {
  if (input.photo) {
    return apiFetch<ApiSaplingStock>('/api/nursery/stock', { method: 'POST', body: stockToForm(input), isForm: true });
  }
  return apiFetch<ApiSaplingStock>('/api/nursery/stock', { method: 'POST', body: input });
}

export async function updateSaplingStock(id: string, input: Partial<SaplingStockInput>): Promise<ApiSaplingStock> {
  if (input.photo) {
    return apiFetch<ApiSaplingStock>(`/api/nursery/stock/${id}`, { method: 'PATCH', body: stockToForm(input), isForm: true });
  }
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

// ---------- Marketplace orders (nursery side) ----------

export type NurseryOrderStatus = 'pending_payment' | 'confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface ApiNurseryOrder {
  id: string;
  status: NurseryOrderStatus;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  deliveryOtp: string | null;
  createdAt: string;
  items: { species: string; quantity: number; unitPriceCents: number }[];
  address: { line1: string; line2: string | null; landmark: string | null; city: string; pincode: string };
  user: { id: string; name: string; handle: string };
}

export async function fetchNurseryOrders(status?: NurseryOrderStatus): Promise<ApiNurseryOrder[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<ApiNurseryOrder[]>(`/api/nursery/orders${query}`);
}

export async function fetchNurseryOrder(id: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}`);
}

export async function packOrder(id: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/pack`, { method: 'POST' });
}

export async function dispatchOrder(id: string, riderName?: string, riderPhone?: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/dispatch`, { method: 'POST', body: { riderName, riderPhone } });
}

export async function deliverOrder(id: string, otp: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/deliver`, { method: 'POST', body: { otp } });
}

export async function cancelNurseryOrder(id: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/cancel`, { method: 'POST' });
}

// ---------- Reviews (nursery side) ----------

export interface ApiNurseryReview {
  id: string;
  nurseryRating: number;
  deliveryRating: number | null;
  comment: string | null;
  nurseryResponse: string | null;
  nurseryRespondedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarEmoji: string };
}

export async function fetchNurseryReviews(): Promise<ApiNurseryReview[]> {
  return apiFetch<ApiNurseryReview[]>('/api/nursery/reviews');
}

export async function respondToReview(id: string, response: string): Promise<ApiNurseryReview> {
  return apiFetch<ApiNurseryReview>(`/api/nursery/reviews/${id}/respond`, { method: 'POST', body: { response } });
}
