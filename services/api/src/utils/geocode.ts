// Best-effort address -> lat/lng lookup, used purely to place a map pin.
// Uses OpenStreetMap's free Nominatim search (no API key/billing needed).
// Never throws — a failed/slow/empty lookup just means no pin, not a failed request.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 4000;

export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PLANT-App/1.0 (tree planting platform; contact: support@plant.app)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
