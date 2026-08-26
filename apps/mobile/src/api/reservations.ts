import { apiFetch } from './client';
import type { ReservationStatus } from './nursery';

export interface ApiMyReservation {
  id: string;
  quantity: number;
  status: ReservationStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  species?: string;
  nursery?: { id: string; nurseryName: string; logoUrl: string | null };
}

export async function fetchMyReservations(): Promise<ApiMyReservation[]> {
  return apiFetch<ApiMyReservation[]>('/api/reservations');
}

export async function cancelReservation(id: string): Promise<void> {
  await apiFetch(`/api/reservations/${id}`, { method: 'DELETE' });
}
