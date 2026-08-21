import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Mirrors PlantTreeScreen's FALLBACK_COORDS (India centroid) so a denied/unavailable
// location still centers nearby-sorted lists somewhere sensible instead of failing outright.
const FALLBACK_COORDS = { lat: 20.5937, lng: 78.9629 };

export function useMyLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
  }, []);

  return { coords, loading };
}
