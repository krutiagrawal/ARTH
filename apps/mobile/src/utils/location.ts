import * as Location from 'expo-location';

const DEFAULT_TIMEOUT_MS = 8000;

// expo-location's getCurrentPositionAsync has no built-in timeout — indoors or with a weak GPS
// signal it can hang indefinitely, leaving callers' loading state stuck forever. Races it against
// a timeout so every caller's existing catch/fallback path fires instead of hanging.
export function getCurrentPositionWithTimeout(
  options: Location.LocationOptions = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Location.LocationObject> {
  return Promise.race([
    Location.getCurrentPositionAsync(options),
    new Promise<Location.LocationObject>((_, reject) =>
      setTimeout(() => reject(new Error('Location request timed out')), timeoutMs)
    ),
  ]);
}
