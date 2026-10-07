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

export async function fetchDeliveryPartners(cursor?: string): Promise<Page<ApiDeliveryPartner>> {
  // 50 (the server max) so the dispatch picker sees nearly everyone without extra requests.
  return apiFetch<Page<ApiDeliveryPartner>>(pagedPath('/api/nursery/delivery-partners', cursor, {}, 50));
}

export async function createDeliveryPartner(input: CreateDeliveryPartnerInput): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>('/api/nursery/delivery-partners', { method: 'POST', body: input });
}

export async function updateDeliveryPartner(id: string, input: UpdateDeliveryPartnerInput): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>(`/api/nursery/delivery-partners/${id}`, { method: 'PATCH', body: input });
}

export async function deactivateDeliveryPartner(id: string): Promise<ApiDeliveryPartner> {
  return apiFetch<ApiDeliveryPartner>(`/api/nursery/delivery-partners/${id}/deactivate`, { method: 'POST' });
}
