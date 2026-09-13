import { apiFetch } from './client';

// The delivery partner's own mobile-app-only endpoints. See deliveryPartners.ts for the
// nursery-side roster management (create/list/update/deactivate).
export interface ApiDeliveryPartnerProfile {
  id: string;
  name: string;
  handle: string;
  phone: string;
  photoUrl: string | null;
  isActive: boolean;
  avgRating: number | null;
  reviewCount: number;
  nurseryName: string;
}

export interface ApiDeliveryQueueItem {
  orderId: string;
  outForDeliveryAt: string | null;
  /** Set once the rider taps "Start delivery" for this order — null means assigned but not yet
   * begun. Location reporting (see reportMyLocation) only fans out to started orders. */
  startedAt: string | null;
  itemCount: number;
  items: { species: string; quantity: number }[];
  customer: { name: string; handle: string };
  address: { line1: string; line2: string | null; landmark: string | null; city: string; pincode: string; lat: number | null; lng: number | null } | null;
  nursery: { id: string; nurseryName: string; lat: number | null; lng: number | null };
}

export async function fetchMyPartnerProfile(): Promise<ApiDeliveryPartnerProfile> {
  return apiFetch<ApiDeliveryPartnerProfile>('/api/delivery-partner/profile');
}

export async function fetchMyDeliveryQueue(): Promise<ApiDeliveryQueueItem[]> {
  return apiFetch<ApiDeliveryQueueItem[]>('/api/delivery-partner/queue');
}

export async function startDelivery(orderId: string): Promise<{ started: boolean }> {
  return apiFetch<{ started: boolean }>(`/api/delivery-partner/orders/${orderId}/start`, { method: 'POST' });
}

export async function reportMyLocation(lat: number, lng: number): Promise<{ updatedOrders: number }> {
  return apiFetch<{ updatedOrders: number }>('/api/delivery-partner/location', { method: 'POST', body: { lat, lng } });
}

export async function completeDelivery(orderId: string, code: string): Promise<void> {
  await apiFetch<void>(`/api/delivery-partner/orders/${orderId}/deliver`, { method: 'POST', body: { code } });
}
