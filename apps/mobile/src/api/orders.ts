import { apiFetch } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';
import type { ApiAddress } from './addresses';

export type OrderFulfillmentType = 'pickup' | 'delivery';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'packed'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'picked_up'
  | 'delivered'
  | 'plantation_verified'
  | 'cancelled';

/** Per-item "how to plant this" detail, joined from the shared species catalog plus the
 * nursery's own suitable-environments tagging on that stock listing. Null when neither resolves
 * (the nursery deleted the stock listing, or the item predates the species catalog link). */
export interface ApiPlantingGuide {
  scientificName: string | null;
  localName: string | null;
  isNative: boolean | null;
  sunlightNeeds: 'full_sun' | 'partial_shade' | 'shade' | null;
  waterNeeds: 'low' | 'medium' | 'high' | null;
  soilNeeds: string | null;
  matureHeightLabel: string | null;
  plantingSeasons: string[];
  suitableEnvironments: string[];
}

export interface ApiOrderItem {
  species: string;
  quantity: number;
  unitPriceCents: number;
  plantingGuide: ApiPlantingGuide | null;
}

export interface ApiOrderTracking {
  deliveryPartnerId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  lat: number | null;
  lng: number | null;
  etaMinutes: number | null;
}

export interface ApiOrderReview {
  nurseryRating: number;
  deliveryRating: number | null;
  comment: string | null;
}

export interface ApiSaplingUnit {
  id: string;
  status: 'issued' | 'collected' | 'planted' | 'void';
  species: string;
}

export interface ApiOrder {
  id: string;
  status: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  subtotalCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  /** What cancelling right now would cost (0 unless the order is paid). */
  cancellationFeeQuoteCents: number;
  /** Fee actually kept on a cancelled order. */
  cancellationFeeCents: number;
  currency: string;
  scheduledFor: string | null;
  pickupWindowLabel: string | null;
  customerNote: string | null;
  // Shown to whoever hands off the saplings (rider or nursery staff) — one shared code for both
  // the pickup and delivery branches. Replaces the old delivery-only `deliveryOtp`.
  handoffCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
  packedAt: string | null;
  readyForPickupAt: string | null;
  outForDeliveryAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  plantationVerifiedAt: string | null;
  cancelledAt: string | null;
  items: ApiOrderItem[];
  saplingUnits: ApiSaplingUnit[];
  // Null for pickup orders — there's nothing to deliver to.
  address: ApiAddress | null;
  nursery: { id: string; nurseryName: string; logoUrl: string | null; contactPhone: string | null };
  tracking: ApiOrderTracking | null;
  review: ApiOrderReview | null;
}

export async function fetchMyOrders(cursor?: string): Promise<Page<ApiOrder>> {
  return apiFetch<Page<ApiOrder>>(pagedPath('/api/orders', cursor));
}

export async function fetchMyOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/api/orders/${id}`);
}

// clientSecret is null when the backend has no Stripe key configured (local/dev only — see
// order.service.ts's checkout()) — the order comes back already confirmed and there's no payment
// sheet to present.
export async function checkout(
  addressId: string,
  customerNote?: string,
): Promise<{ order: ApiOrder; clientSecret: string | null }> {
  return apiFetch('/api/orders/checkout', { method: 'POST', body: { addressId, customerNote: customerNote || undefined } });
}

export async function cancelOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/api/orders/${id}/cancel`, { method: 'POST' });
}

export async function submitOrderReview(
  id: string,
  input: { nurseryRating: number; deliveryRating?: number; comment?: string },
): Promise<ApiOrderReview> {
  return apiFetch<ApiOrderReview>(`/api/orders/${id}/review`, { method: 'POST', body: input });
}

export interface ApiMyReview {
  id: string;
  orderId: string;
  nurseryId: string;
  nurseryName: string;
  nurseryLogoUrl: string | null;
  nurseryRating: number;
  deliveryRating: number | null;
  comment: string | null;
  createdAt: string;
}

export async function fetchMyReviews(cursor?: string): Promise<Page<ApiMyReview>> {
  return apiFetch<Page<ApiMyReview>>(pagedPath('/api/orders/reviews/mine', cursor));
}

/** Dialog message for the buyer's cancel confirmation, spelling out any fee up front. */
export function cancelOrderMessage(order: Pick<ApiOrder, 'totalCents' | 'cancellationFeeQuoteCents'>): string {
  const fee = order.cancellationFeeQuoteCents;
  const rupees = (c: number) => `₹${(c / 100).toLocaleString('en-IN')}`;
  if (!fee) return 'Your order will be cancelled and any payment refunded in full.';
  return `A cancellation fee of ${rupees(fee)} applies because your payment is already confirmed. You will be refunded ${rupees(order.totalCents - fee)}.`;
}

/** Past the point where the buyer can cancel on their own (nursery has started packing). */
export function needsNurseryContact(status: OrderStatus): boolean {
  return ['packed', 'ready_for_pickup', 'out_for_delivery'].includes(status);
}
