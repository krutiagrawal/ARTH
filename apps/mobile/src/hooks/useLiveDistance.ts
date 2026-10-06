import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { haversineMeters, type LatLng } from '../utils/geo';

// Streams the user's position and the straight-line distance to `target`, updating as they move.
// Deliberately NOT gated by the Location Tracking setting (unlike useMyLocation's ambient reads):
// the user explicitly asked to be guided to this tree.
export function useLiveDistance(target: LatLng | null) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setDenied(true);
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 2, timeInterval: 2000 },
        (loc) => setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const distanceM = position && target ? haversineMeters(position, target) : null;
  return { position, distanceM, denied };
}
