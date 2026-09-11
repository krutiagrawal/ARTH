import { apiFetch } from './client';
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

export interface ApiOrderItem {
  species: string;
  quantity: number;
  unitPriceCents: number;
}

export interface ApiOrderTracking {
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
  currency: string;
  scheduledFor: string | null;
  pickupWindowLabel: string | null;
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

export async function fetchMyOrders(): Promise<ApiOrder[]> {
  return apiFetch<ApiOrder[]>('/api/orders');
}

export async function fetchMyOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/api/orders/${id}`);
}

// clientSecret is null when the backend has no Stripe key configured (local/dev only — see
// order.service.ts's checkout()) — the order comes back already confirmed and there's no payment
// sheet to present.
export async function checkout(addressId: string): Promise<{ order: ApiOrder; clientSecret: string | null }> {
  return apiFetch('/api/orders/checkout', { method: 'POST', body: { addressId } });
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
