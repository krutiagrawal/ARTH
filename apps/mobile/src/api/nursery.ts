import { apiFetch, toFormFile } from './client';

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
  // ---- Pickup/delivery configuration (optional: older profiles may not have these set) ----
  offersPickup?: boolean;
  deliveryFeeCents?: number | null;
  minDeliveryOrderCents?: number | null;
  operatingHours?: OperatingHourRow[];
  pickupWindows?: PickupWindowRow[];
  pickupInstructions?: string | null;
}

export interface OperatingHourRow {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  opensAt: string;
  closesAt: string;
}

export interface PickupWindowRow {
  label: string;
  startTime: string;
  endTime: string;
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
  // ---- Pickup/delivery configuration ----
  offersPickup?: boolean;
  deliveryFeeCents?: number | null;
  minDeliveryOrderCents?: number | null;
  operatingHours?: OperatingHourRow[];
  pickupWindows?: PickupWindowRow[];
  pickupInstructions?: string;
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
  if (input.offersPickup !== undefined) form.append('offersPickup', String(input.offersPickup));
  // The multipart schema (updateNurseryProfileSchema) coerces every string through
  // z.coerce.number(), so an empty string would coerce to 0 rather than clearing the field —
  // there's no wire-level way to distinguish "0 cents" from "cleared" over multipart. Omitting
  // the field entirely (leave-unchanged) is the only non-destructive option from this client.
  if (input.deliveryFeeCents !== undefined && input.deliveryFeeCents !== null) form.append('deliveryFeeCents', String(input.deliveryFeeCents));
  if (input.minDeliveryOrderCents !== undefined && input.minDeliveryOrderCents !== null) form.append('minDeliveryOrderCents', String(input.minDeliveryOrderCents));
  if (input.operatingHours !== undefined) form.append('operatingHours', JSON.stringify(input.operatingHours));
  if (input.pickupWindows !== undefined) form.append('pickupWindows', JSON.stringify(input.pickupWindows));
  if (input.pickupInstructions !== undefined) form.append('pickupInstructions', input.pickupInstructions);
  if (input.logo) {
    form.append('logo', toFormFile(input.logo.uri), input.logo.name);
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

// ---------- Today dashboard ----------

export type NurseryActivityType =
  | 'order_placed'
  | 'order_picked_up'
  | 'order_delivered'
  | 'sapling_planted'
  | 'stock_low'
  | 'stock_out_of_stock'
  | 'bulk_requirement_nearby'
  | 'nursery_tree_milestone'
  | 'nursery_impact_milestone';

export interface ApiNurseryActivityItem {
  id: string;
  type: NurseryActivityType;
  data: Record<string, any>;
  createdAt: string;
}

export interface ApiNurseryLowStockSpecies {
  id: string;
  species: string;
  quantity: number;
  availabilityStatus: 'available' | 'low_stock' | 'out_of_stock';
}

export interface ApiNurseryUpcomingBulkRequirement {
  id: string;
  ngoName: string;
  species: string;
  quantityNeeded: number;
  quantityFulfilled: number;
  neededByDate: string | null;
  city: string | null;
}

export interface ApiNurseryDashboardToday {
  ordersToday: number;
  newPending: number;
  readyForPickup: number;
  deliveriesPending: number;
  lowStockSpecies: ApiNurseryLowStockSpecies[];
  saplingsSuppliedLifetime: number;
  verifiedPlantations: number;
  revenueViaArthCents: number;
  upcomingBulkRequirements: ApiNurseryUpcomingBulkRequirement[];
  activity: ApiNurseryActivityItem[];
}

export async function fetchNurseryDashboardToday(): Promise<ApiNurseryDashboardToday> {
  return apiFetch<ApiNurseryDashboardToday>('/api/nursery/dashboard/today');
}

// ---------- Impact ----------

export interface ApiNurseryImpact {
  treesGrowingThroughYou: number;
  totalSaplingsSupplied: number;
  verificationPercentage: number;
  speciesCount: number;
  ngoDrivesSupported: number;
  estimatedCo2Kg: number;
  monthlyTrend: { month: string; count: number }[];
}

export async function fetchNurseryImpact(): Promise<ApiNurseryImpact> {
  return apiFetch<ApiNurseryImpact>('/api/nursery/impact');
}

export type SunlightNeeds = 'full_sun' | 'partial_shade' | 'shade';
export type WaterNeeds = 'low' | 'medium' | 'high';

export interface ApiSpeciesRef {
  id: string;
  commonName: string;
  emoji: string;
  scientificName: string | null;
  localName: string | null;
  isNative: boolean | null;
  sunlightNeeds: SunlightNeeds | null;
  waterNeeds: WaterNeeds | null;
  soilNeeds: string | null;
  matureHeightLabel: string | null;
  plantingSeasons: string[];
  isCuratedBotanical: boolean;
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
  speciesId: string | null;
  scientificNameSnap: string | null;
  ageLabel: string | null;
  heightLabel: string | null;
  potSize: string | null;
  suitableEnvironments: string[];
  nurseryNotes: string | null;
  lowStockThreshold: number | null;
  speciesRef: ApiSpeciesRef | null;
  availabilityStatus: 'available' | 'low_stock' | 'out_of_stock';
}

export interface InlineSpeciesInput {
  commonName: string;
  scientificName?: string;
  localName?: string;
  emoji?: string;
  isNative?: boolean;
  sunlightNeeds?: SunlightNeeds;
  waterNeeds?: WaterNeeds;
  soilNeeds?: string;
  matureHeightLabel?: string;
  plantingSeasons?: string[];
  co2KgPerYear?: number;
  description?: string;
}

export interface SaplingStockInput {
  quantity: number;
  isFree?: boolean;
  priceCents?: number;
  photo?: { uri: string; name: string; type: string };
  // Link to the shared species catalog (preferred) — OR supply an inline species definition below.
  speciesId?: string;
  speciesDetails?: InlineSpeciesInput;
  ageLabel?: string;
  heightLabel?: string;
  potSize?: string;
  suitableEnvironments?: string[];
  nurseryNotes?: string;
  lowStockThreshold?: number;
}

export interface StockFilter {
  species?: string;
  native?: boolean;
  availability?: 'available' | 'low_stock' | 'out_of_stock';
  season?: string;
}

export async function fetchSaplingStock(filter: StockFilter = {}): Promise<ApiSaplingStock[]> {
  const query = new URLSearchParams();
  if (filter.species) query.set('species', filter.species);
  if (filter.native !== undefined) query.set('native', String(filter.native));
  if (filter.availability) query.set('availability', filter.availability);
  if (filter.season) query.set('season', filter.season);
  const qs = query.toString();
  return apiFetch<ApiSaplingStock[]>(`/api/nursery/stock${qs ? `?${qs}` : ''}`);
}

function stockToForm(input: Partial<SaplingStockInput>): FormData {
  const form = new FormData();
  if (input.quantity !== undefined) form.append('quantity', String(input.quantity));
  if (input.isFree !== undefined) form.append('isFree', String(input.isFree));
  if (input.priceCents !== undefined) form.append('priceCents', String(input.priceCents));
  if (input.speciesId !== undefined) form.append('speciesId', input.speciesId);
  if (input.speciesDetails !== undefined) form.append('species', JSON.stringify(input.speciesDetails));
  if (input.ageLabel !== undefined) form.append('ageLabel', input.ageLabel);
  if (input.heightLabel !== undefined) form.append('heightLabel', input.heightLabel);
  if (input.potSize !== undefined) form.append('potSize', input.potSize);
  if (input.suitableEnvironments !== undefined) form.append('suitableEnvironments', JSON.stringify(input.suitableEnvironments));
  if (input.nurseryNotes !== undefined) form.append('nurseryNotes', input.nurseryNotes);
  if (input.lowStockThreshold !== undefined) form.append('lowStockThreshold', String(input.lowStockThreshold));
  if (input.photo) {
    form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  }
  return form;
}

/** JSON body variant (no photo): the inline species definition, unlike the multipart path, is
 * sent as a real nested object here — the wire contract only requires stringifying it for
 * multipart, where every field has to be a string part. */
function stockToJsonBody(input: Partial<SaplingStockInput>): Record<string, unknown> {
  const { photo, speciesDetails, ...rest } = input;
  return { ...rest, ...(speciesDetails !== undefined ? { species: speciesDetails } : {}) };
}

export async function createSaplingStock(input: SaplingStockInput): Promise<ApiSaplingStock> {
  if (input.photo) {
    return apiFetch<ApiSaplingStock>('/api/nursery/stock', { method: 'POST', body: stockToForm(input), isForm: true });
  }
  return apiFetch<ApiSaplingStock>('/api/nursery/stock', { method: 'POST', body: stockToJsonBody(input) });
}

export async function updateSaplingStock(id: string, input: Partial<SaplingStockInput>): Promise<ApiSaplingStock> {
  if (input.photo) {
    return apiFetch<ApiSaplingStock>(`/api/nursery/stock/${id}`, { method: 'PATCH', body: stockToForm(input), isForm: true });
  }
  return apiFetch<ApiSaplingStock>(`/api/nursery/stock/${id}`, { method: 'PATCH', body: stockToJsonBody(input) });
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

export async function fetchNurseryPublicAchievements(nurseryId: string): Promise<ApiNurseryBadge[]> {
  return apiFetch<ApiNurseryBadge[]>(`/api/nurseries/${nurseryId}/achievements`);
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

export type NurseryOrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'packed'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'plantation_verified'
  | 'cancelled';

export type SaplingUnitStatus = 'issued' | 'collected' | 'planted' | 'void';

export interface ApiSaplingUnit {
  id: string;
  status: SaplingUnitStatus;
  speciesNameSnapshot?: string;
  species?: string;
}

export interface ApiNurseryOrder {
  id: string;
  status: NurseryOrderStatus;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** Renamed from the old `deliveryOtp` — same handoff code, used for both pickup and delivery
   * confirmation now. */
  handoffCode: string | null;
  fulfillmentType: 'pickup' | 'delivery';
  scheduledFor: string | null;
  pickupWindowLabel: string | null;
  readyForPickupAt: string | null;
  pickedUpAt: string | null;
  plantationVerifiedAt: string | null;
  createdAt: string;
  /** `saplingUnits` is only populated on the item when this came from the order-detail endpoint
   * (`GET /api/nursery/orders/:id`) — the list endpoint doesn't include it. */
  items: { species: string; quantity: number; unitPriceCents: number; saplingUnits?: ApiSaplingUnit[] }[];
  /** Null for a pickup order — a pickup never has a delivery address. */
  address: { line1: string; line2: string | null; landmark: string | null; city: string; pincode: string } | null;
  user: { id: string; name: string; handle: string };
}

export interface NurseryOrdersFilter {
  status?: NurseryOrderStatus;
  fulfillmentType?: 'pickup' | 'delivery';
}

export async function fetchNurseryOrders(filter: NurseryOrdersFilter | NurseryOrderStatus = {}): Promise<ApiNurseryOrder[]> {
  const normalized: NurseryOrdersFilter = typeof filter === 'string' ? { status: filter } : filter;
  const query = new URLSearchParams();
  if (normalized.status) query.set('status', normalized.status);
  if (normalized.fulfillmentType) query.set('fulfillmentType', normalized.fulfillmentType);
  const qs = query.toString();
  return apiFetch<ApiNurseryOrder[]>(`/api/nursery/orders${qs ? `?${qs}` : ''}`);
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

export async function deliverOrder(id: string, code: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/deliver`, { method: 'POST', body: { code } });
}

export async function readyForPickupOrder(id: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/ready-for-pickup`, { method: 'POST' });
}

export async function pickedUpOrder(id: string, code: string): Promise<ApiNurseryOrder> {
  return apiFetch<ApiNurseryOrder>(`/api/nursery/orders/${id}/picked-up`, { method: 'POST', body: { code } });
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

// ---------- Bulk requirements (NGO <-> Nursery sapling matching, nursery side) ----------

export type BulkRequirementStatus = 'open' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'expired';
export type BulkResponseStatus = 'proposed' | 'accepted' | 'declined' | 'fulfilled' | 'withdrawn';

export interface ApiBulkResponse {
  id: string;
  quantityOffered: number;
  priceCents: number | null;
  canDeliver: boolean;
  canPickup: boolean;
  message: string | null;
  status: BulkResponseStatus;
}

export interface ApiBulkRequirement {
  id: string;
  ngoId: string;
  driveId: string | null;
  speciesId: string | null;
  speciesNote: string | null;
  nativePreferred: boolean;
  quantityNeeded: number;
  quantityFulfilled: number;
  neededByDate: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  status: BulkRequirementStatus;
  ngo: { orgName: string; logoUrl: string | null };
  species: { commonName: string } | null;
  distanceKm: number | null;
  myResponse: ApiBulkResponse | null;
}

/** No status filter returns only `open`/`partially_fulfilled` requirements server-side (see
 * bulkRequirement.service.ts's `listRelevantForNursery`) — there's no dedicated "everything"
 * mode, so a `fulfilled` requirement only shows up when explicitly requested with that status. */
export async function fetchNurseryBulkRequirements(status?: BulkRequirementStatus): Promise<ApiBulkRequirement[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<ApiBulkRequirement[]>(`/api/nursery/bulk-requirements${query}`);
}

export interface RespondToBulkRequirementInput {
  quantityOffered: number;
  priceCents?: number;
  canDeliver?: boolean;
  canPickup?: boolean;
  message?: string;
}

export async function respondToBulkRequirement(id: string, input: RespondToBulkRequirementInput): Promise<ApiBulkResponse> {
  return apiFetch<ApiBulkResponse>(`/api/nursery/bulk-requirements/${id}/respond`, { method: 'POST', body: input });
}

export async function withdrawBulkResponse(responseId: string): Promise<ApiBulkResponse> {
  return apiFetch<ApiBulkResponse>(`/api/nursery/bulk-requirements/responses/${responseId}/withdraw`, { method: 'POST' });
}

export async function markBulkResponseFulfilled(responseId: string): Promise<ApiBulkResponse> {
  return apiFetch<ApiBulkResponse>(`/api/nursery/bulk-requirements/responses/${responseId}/fulfilled`, { method: 'POST' });
}
