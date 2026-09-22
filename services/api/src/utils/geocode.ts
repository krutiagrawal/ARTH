// Address -> lat/lng lookup and address search, both backed by OpenStreetMap's free Nominatim
// API (no API key/billing needed). Every request funnels through `throttledFetch` below: Nominatim's
// usage policy caps free usage at one request per second for the whole app, not per caller, so a
// burst of concurrent geocodes (or a user typing into a search box) has to be serialized here rather
// than left to each call site.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 4000;
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = 'PLANT-App/1.0 (tree planting platform; contact: support@plant.app)';

// The product only launches in Pune right now (see CityPickerField.tsx), so address-field
// search-as-you-type suggestions are boxed to Pune city plus its nearby villages/suburbs —
// left,top,right,bottom in lon/lat — rather than surfacing same-named places anywhere on earth.
// `bounded=1` makes Nominatim enforce this as a hard filter instead of just a ranking hint.
const PUNE_VIEWBOX = '73.65,18.75,74.05,18.30';

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
export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = `${NOMINATIM_URL}?format=json&addressdetails=1&limit=6&viewbox=${PUNE_VIEWBOX}&bounded=1&q=${encodeURIComponent(trimmed)}`;
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
