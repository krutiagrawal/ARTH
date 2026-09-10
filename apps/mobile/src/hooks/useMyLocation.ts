import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { getCurrentPositionWithTimeout } from '../utils/location';
import { useSettings } from './useApiQueries';

// Mirrors PlantTreeScreen's FALLBACK_COORDS (India centroid) so a denied/unavailable
// location still centers nearby-sorted lists somewhere sensible instead of failing outright.
const FALLBACK_COORDS = { lat: 20.5937, lng: 78.9629 };

export function useMyLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  // Ambient/automatic reads (nearby sorting for directories, drives, adoptable trees) respect the
  // Location Tracking preference — unlike explicit user-initiated location actions (planting a
  // tree, setting a delivery address) which always need a real fix regardless of this setting.
  const { data: settings } = useSettings();
  const locationTrackingEnabled = settings?.locationTracking ?? true;

  useEffect(() => {
    if (!locationTrackingEnabled) {
      setCoords(FALLBACK_COORDS);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await getCurrentPositionWithTimeout({ accuracy: Location.Accuracy.Balanced });
          if (mounted) setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else if (mounted) {
          setCoords(FALLBACK_COORDS);
        }
      } catch {
        if (mounted) setCoords(FALLBACK_COORDS);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [locationTrackingEnabled]);

  return { coords, loading };
}
