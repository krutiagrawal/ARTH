import { apiFetch } from './client';

export interface ApiWishlistItem {
  id: string;
  nurseryId: string | null;
  stockId: string | null;
  createdAt: string;
  nursery: { id: string; nurseryName: string; logoUrl: string | null; avgRating: string | null } | null;
  stock: { id: string; species: string; priceCents: number | null; quantity: number; nursery: { id: string; nurseryName: string } } | null;
}

export async function fetchWishlist(): Promise<ApiWishlistItem[]> {
  return apiFetch<ApiWishlistItem[]>('/api/wishlist');
}

export async function addWishlistItem(input: { nurseryId?: string; stockId?: string }): Promise<ApiWishlistItem> {
  return apiFetch<ApiWishlistItem>('/api/wishlist', { method: 'POST', body: input });
}

export async function removeWishlistItem(id: string): Promise<void> {
  await apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
}
