// Swappable delivery-tracking provider. `mock` is the only implementation today — it simulates a
// straight-line trip from the nursery to the delivery address over a fixed duration, computed on
// read (no background job needed). Once a real account exists (Porter's business API, or a
// nursery-staff rider app) a new adapter goes here and DeliveryTracking.provider picks it; nothing
// above this module (order.service.ts, the tracking route, mobile UI) needs to change.
export type LatLng = { lat: number; lng: number };

export interface LiveLocation {
  lat: number | null;
  lng: number | null;
  etaMinutes: number | null;
}

const MOCK_TRIP_DURATION_MINUTES = 15;

function mockLiveLocation(origin: LatLng | null, destination: LatLng | null, outForDeliveryAt: Date | null): LiveLocation {
  if (!origin || !destination || !outForDeliveryAt) return { lat: null, lng: null, etaMinutes: null };

  const elapsedMs = Date.now() - outForDeliveryAt.getTime();
  const totalMs = MOCK_TRIP_DURATION_MINUTES * 60 * 1000;
  const fraction = Math.max(0, Math.min(1, elapsedMs / totalMs));

  return {
    lat: origin.lat + (destination.lat - origin.lat) * fraction,
    lng: origin.lng + (destination.lng - origin.lng) * fraction,
    etaMinutes: Math.max(0, Math.round(MOCK_TRIP_DURATION_MINUTES * (1 - fraction))),
  };
}

export function getLiveLocation(
  provider: 'mock' | 'porter' | 'nursery_staff',
  origin: LatLng | null,
  destination: LatLng | null,
  outForDeliveryAt: Date | null,
): LiveLocation {
  // porter/nursery_staff fall back to the mock trip until real credentials are wired in.
  switch (provider) {
    case 'mock':
    case 'porter':
    case 'nursery_staff':
    default:
      return mockLiveLocation(origin, destination, outForDeliveryAt);
  }
}
