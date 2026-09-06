import { apiFetch } from './client';
import type { ApiAddress } from './addresses';

export type OrderStatus = 'pending_payment' | 'confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

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

export interface ApiOrder {
  id: string;
  status: OrderStatus;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  currency: string;
  deliveryOtp: string | null;
  createdAt: string;
  confirmedAt: string | null;
  packedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: ApiOrderItem[];
  address: ApiAddress;
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

export async function checkout(addressId: string): Promise<{ order: ApiOrder; clientSecret: string }> {
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
