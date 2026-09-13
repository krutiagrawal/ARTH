import { haversineDistanceKm } from '../utils/geo';

// Swappable delivery-tracking provider. `mock` simulates a straight-line trip from the nursery to
// the delivery address over a fixed duration, computed on read (no background job needed).
// `nursery_staff` is real: DeliveryTracking.lat/lng are actually written by the assigned
// DeliveryPartnerProfile's own app (see deliveryPartner.service.ts's reportLocation) — this module
// just turns that raw position into an ETA. `porter` remains a placeholder (falls back to mock)
// until a real business-API integration exists. Nothing above this module (order.service.ts, the
// tracking route, mobile UI) needs to change when a provider's implementation changes.
export type LatLng = { lat: number; lng: number };

export interface LiveLocation {
  lat: number | null;
  lng: number | null;
  etaMinutes: number | null;
}

const MOCK_TRIP_DURATION_MINUTES = 15;
// No live-traffic API for real GPS ETAs — assume a flat average speed for local nursery
// deliveries (bike/scooter in city traffic). Good enough for an ETA estimate, not a promise.
const ASSUMED_SPEED_KMH = 20;

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

// `tracked` is the last real GPS fix reported by the delivery partner's app (DeliveryTracking's
// own lat/lng column), if any has arrived yet.
function realLiveLocation(tracked: LatLng | null, destination: LatLng | null): LiveLocation {
  if (!tracked) return { lat: null, lng: null, etaMinutes: null };

  const etaMinutes = destination
    ? Math.max(0, Math.round((haversineDistanceKm(tracked, destination) / ASSUMED_SPEED_KMH) * 60))
    : null;

  return { lat: tracked.lat, lng: tracked.lng, etaMinutes };
}

export function getLiveLocation(
  provider: 'mock' | 'porter' | 'nursery_staff',
  origin: LatLng | null,
  destination: LatLng | null,
  outForDeliveryAt: Date | null,
  tracked: LatLng | null = null,
): LiveLocation {
  switch (provider) {
    case 'nursery_staff':
      return realLiveLocation(tracked, destination);
    case 'mock':
    case 'porter':
    default:
      return mockLiveLocation(origin, destination, outForDeliveryAt);
  }
}
