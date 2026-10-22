// Address -> lat/lng lookup and address search, both backed by OpenStreetMap's free Nominatim
// API (no API key/billing needed). Every request funnels through `throttledFetch` below: Nominatim's
// usage policy caps free usage at one request per second for the whole app, not per caller, so a
// burst of concurrent geocodes (or a user typing into a search box) has to be serialized here rather
// than left to each call site.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 4000;
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = 'Arth-App/1.0 (tree planting platform; contact: support@arth.app)';

// The product only launches in Pune right now (see CityPickerField.tsx), so address-field
// search-as-you-type suggestions favour Pune city plus its nearby villages/suburbs —
// left,top,right,bottom in lon/lat. A wider box than the city proper so outlying localities
// (Hinjewadi, Wagholi, Lonavala road villages…) are still "local". Results from this box are
// listed first; anywhere else in India fills in after, so small localities that OSM tags outside
// the box (or users planting beyond Pune) still find a match instead of an empty list.
const PUNE_VIEWBOX = '73.45,18.85,74.30,18.15';
const PUNE_CENTER = { lat: 18.5204, lng: 73.8567 };

let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

async function throttledFetch(url: string): Promise<Response | null> {
  const result = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      return response.ok ? response : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
  // The queue must keep advancing even if this particular lookup failed, so the next
  // caller isn't stuck behind a rejected promise — swallow here, real callers see `null`.
  queue = result.catch(() => null);
  return result;
}

/** Best-effort address -> lat/lng, used purely to place a map pin. Never throws — a failed/slow/empty
 * lookup just means no pin, not a failed request. */
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
  const response = await throttledFetch(url);
  if (!response) return null;

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  city: string | null;
}

/** Live search-as-you-type suggestions for an address field. Also never throws — an empty list just
 * means "no suggestions yet", not a failed request. */
export async function searchAddress(query: string, near?: { lat: number; lng: number }): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // Nominatim alone is thin for street/building/landmark names in India, and its 1 req/s queue
  // means a few keystrokes can time out into an empty list. Photon (OSM-based, built for
  // search-as-you-type, no throttle needed) runs alongside it; Photon results come first since
  // they're biased to the user's own position, then Nominatim fills any gaps.
  const [photon, nominatim] = await Promise.all([searchPhoton(trimmed, near ?? PUNE_CENTER), searchNominatim(trimmed)]);

  const merged: AddressSuggestion[] = [];
  for (const s of [...photon, ...nominatim]) {
    const duplicate = merged.some(
      (m) => m.label === s.label || (Math.abs(m.lat - s.lat) < 0.0003 && Math.abs(m.lng - s.lng) < 0.0003),
    );
    if (!duplicate) merged.push(s);
  }
  return merged.slice(0, 15);
}

const PHOTON_URL = 'https://photon.komoot.io/api/';

async function searchPhoton(query: string, near: { lat: number; lng: number }): Promise<AddressSuggestion[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Bias (not restrict) toward the user's position, or Pune - nearby hits rank first, but a
    // locality elsewhere in India still comes back. Over-fetch since non-India hits are dropped.
    const response = await fetch(`${PHOTON_URL}?limit=20&lang=en&location_bias_scale=0.6&q=${encodeURIComponent(query)}&lat=${near.lat}&lon=${near.lng}`, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, string | undefined>;
      }>;
    };
    const out: AddressSuggestion[] = [];
    for (const f of data.features ?? []) {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode !== 'IN') continue;
      if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      const parts = [p.name, street, p.locality, p.district, p.city ?? p.county, p.state, p.postcode, p.country]
        .filter((part, i, arr): part is string => !!part && arr.indexOf(part) === i);
      if (!parts.length) continue;
      out.push({ label: parts.join(', '), lat, lng, city: p.city ?? p.county ?? p.district ?? null });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchNominatim(trimmed: string): Promise<AddressSuggestion[]> {
  const q = encodeURIComponent(trimmed);
  // Inside the Pune box first (hard filter); only if that is thin, widen to all of India with the
  // box as a ranking hint. Skips the second throttled call whenever the first already has enough.
  const local = await nominatimQuery(`${NOMINATIM_URL}?format=json&addressdetails=1&limit=10&viewbox=${PUNE_VIEWBOX}&bounded=1&q=${q}`);
  if (local.length >= 6) return local;
  const wide = await nominatimQuery(`${NOMINATIM_URL}?format=json&addressdetails=1&limit=10&countrycodes=in&viewbox=${PUNE_VIEWBOX}&q=${q}`);
  return [...local, ...wide];
}

async function nominatimQuery(url: string): Promise<AddressSuggestion[]> {
  const response = await throttledFetch(url);
  if (!response) return [];

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { city?: string; town?: string; village?: string; suburb?: string };
  }>;

  const suggestions: AddressSuggestion[] = [];
  for (const r of results) {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const a = r.address ?? {};
    suggestions.push({ label: r.display_name, lat, lng, city: a.city ?? a.town ?? a.village ?? a.suburb ?? null });
  }
  return suggestions;
}

export interface PincodeCheck {
  /** match: the pincode belongs to this location. mismatch: it doesn't. unverified: the lookup
   * services were unreachable or had no data, so nothing can be said either way. */
  status: 'match' | 'mismatch' | 'unverified';
  /** The pincode OpenStreetMap has for the location, when it has one. */
  actual?: string;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// OSM's postcode on a single building is sometimes missing or a neighbour's, so a pincode that
// differs from it can still be right when it sits this close to the pincode's own centre.
const PINCODE_NEAR_KM = 2.5;
// With no postcode on the location at all, fall back to "is it inside this pincode's area".
const PINCODE_AREA_KM = 6;

/** Does `pincode` actually belong to the place at lat/lng? Never throws. */
export async function verifyPincode(lat: number, lng: number, pincode: string): Promise<PincodeCheck> {
  const pin = pincode.trim();
  if (!/^\d{6}$/.test(pin) || !Number.isFinite(lat) || !Number.isFinite(lng)) return { status: 'unverified' };

  let actual: string | undefined;
  const reverse = await throttledFetch(`${NOMINATIM_REVERSE_URL}?format=json&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`);
  if (reverse) {
    const r = (await reverse.json().catch(() => null)) as { address?: { postcode?: string } } | null;
    actual = r?.address?.postcode?.replace(/\s/g, '');
  }
  if (actual === pin) return { status: 'match', actual };

  const centre = await throttledFetch(`${NOMINATIM_URL}?format=json&limit=1&countrycodes=in&postalcode=${pin}`);
  const results = centre ? ((await centre.json().catch(() => [])) as Array<{ lat: string; lon: string }>) : [];
  const first = results[0];
  const cLat = Number(first?.lat);
  const cLng = Number(first?.lon);
  if (first && Number.isFinite(cLat) && Number.isFinite(cLng)) {
    const km = distanceKm(lat, lng, cLat, cLng);
    if (km <= (actual ? PINCODE_NEAR_KM : PINCODE_AREA_KM)) return { status: 'match', actual };
    return { status: 'mismatch', actual };
  }

  // The pincode has no known location: if OSM at least knows this place's pincode, they differ.
  return actual ? { status: 'mismatch', actual } : { status: 'unverified' };
}

/** lat/lng -> human-readable address, for "use current location" buttons that should fill an
 * address text field rather than leave it blank next to a silently-captured GPS pin. Never
 * throws — a failed/slow lookup just means the field stays as the user left it. */
export async function reverseGeocode(lat: number, lng: number): Promise<AddressSuggestion | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = `${NOMINATIM_REVERSE_URL}?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
  const response = await throttledFetch(url);
  if (!response) return null;

  const r = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: { city?: string; town?: string; village?: string; suburb?: string };
  };
  if (!r.display_name) return null;

  const a = r.address ?? {};
  return {
    label: r.display_name,
    lat: Number(r.lat) || lat,
    lng: Number(r.lon) || lng,
    city: a.city ?? a.town ?? a.village ?? a.suburb ?? null,
  };
}
