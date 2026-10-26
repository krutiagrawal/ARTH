import { apiFetch } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';

// Nursery-side management of its delivery-partner roster. See deliveryPartnerApp.ts for the
// partner's own mobile app endpoints.
export interface ApiDeliveryPartner {
  id: string;
  name: string;
  handle: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  isActive: boolean;
  avgRating: number | null;
  reviewCount: number;
  activeOrderCount: number;
  createdAt: string;
}

export interface CreateDeliveryPartnerInput {
  email: string;
  password: string;
  name: string;
  handle: string;
  phone: string;
  photoUrl?: string;
}

export interface UpdateDeliveryPartnerInput {
  name?: string;
  phone?: string;
  photoUrl?: string;
  isActive?: boolean;
}

/** `active` = every rider who can take orders (available + busy). */
export type DeliveryPartnerStatusFilter = 'active' | 'available' | 'busy' | 'inactive';

export interface DeliveryPartnerFilter {
  q?: string;
  status?: DeliveryPartnerStatusFilter;
}

export async function fetchDeliveryPartners(filter: DeliveryPartnerFilter = {}, cursor?: string): Promise<Page<ApiDeliveryPartner>> {
  // Search and status are applied on the server so they cover every rider, not just loaded pages.
  return apiFetch<Page<ApiDeliveryPartner>>(
    pagedPath('/api/nursery/delivery-partners', cursor, { q: filter.q?.trim() || undefined, status: filter.status }, 30),
  );
}

export interface ApiDeliveryPartnersSummary {
  total: number;
  available: number;
  busy: number;
  inactive: number;
}

export async function fetchDeliveryPartnersSummary(): Promise<ApiDeliveryPartnersSummary> {
  return apiFetch<ApiDeliveryPartnersSummary>('/api/nursery/delivery-partners/summary');
}

export async function createDeliveryPartner(input: CreateDeliveryPartnerInput): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>('/api/nursery/delivery-partners', { method: 'POST', body: input });
}

export async function updateDeliveryPartner(id: string, input: UpdateDeliveryPartnerInput): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>(`/api/nursery/delivery-partners/${id}`, { method: 'PATCH', body: input });
}

export interface ApiDeliveryPartnerOverview {
  partner: ApiDeliveryPartner;
  stats: { totalDelivered: number; deliveredLast30d: number; activeNow: number; avgDeliveryMinutes: number | null };
  current: {
    orderId: string;
    customerName: string;
    summary: string;
    dispatchedAt: string | null;
    started: boolean;
    etaMinutes: number | null;
  }[];
  recent: {
    orderId: string;
    customerName: string;
    summary: string;
    deliveredAt: string | null;
    minutes: number | null;
    rating: number | null;
  }[];
}

export interface ApiLiveFleetOrder {
  orderId: string;
  customerName: string;
  summary: string;
  started: boolean;
  etaMinutes: number | null;
  destination: { label: string | null; lat: number | null; lng: number | null };
}

export interface ApiLiveFleetRider {
  partnerId: string;
  name: string;
  phone: string;
  /** null until the rider starts one of their assigned deliveries. */
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
  orders: ApiLiveFleetOrder[];
}

export interface ApiLiveFleet {
  nursery: { name: string; lat: number | null; lng: number | null };
  riders: ApiLiveFleetRider[];
  fetchedAt: string;
}

export async function fetchLiveFleet(): Promise<ApiLiveFleet> {
  return apiFetch<ApiLiveFleet>('/api/nursery/delivery-partners/live');
}

export async function fetchDeliveryPartnerOverview(id: string): Promise<ApiDeliveryPartnerOverview> {
  return apiFetch<ApiDeliveryPartnerOverview>(`/api/nursery/delivery-partners/${id}/overview`);
}

export async function deactivateDeliveryPartner(id: string): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>(`/api/nursery/delivery-partners/${id}/deactivate`, { method: 'POST' });
}
