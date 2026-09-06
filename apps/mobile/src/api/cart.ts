import { apiFetch } from './client';

export interface ApiCartItem {
  id: string;
  quantity: number;
  stockId: string;
  species: string;
  priceCents: number;
  availableQuantity: number;
  nursery: { id: string; nurseryName: string; logoUrl: string | null };
  lineTotalCents: number;
}

export interface ApiCart {
  items: ApiCartItem[];
  subtotalCents: number;
}

export async function fetchCart(): Promise<ApiCart> {
  return apiFetch<ApiCart>('/api/cart');
}

export async function addCartItem(stockId: string, quantity: number): Promise<ApiCartItem> {
  return apiFetch<ApiCartItem>('/api/cart/items', { method: 'POST', body: { stockId, quantity } });
}

export async function updateCartItem(itemId: string, quantity: number): Promise<ApiCartItem> {
  return apiFetch<ApiCartItem>(`/api/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
}

export async function removeCartItem(itemId: string): Promise<void> {
  await apiFetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
}

export async function clearCart(): Promise<void> {
  await apiFetch('/api/cart', { method: 'DELETE' });
}
