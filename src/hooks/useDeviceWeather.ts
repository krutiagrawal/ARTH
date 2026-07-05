import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { fetchWeather, type ApiWeather } from '../api/weather';

export function useDeviceWeather() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[useDeviceWeather] location permission denied — weather-based scenery (e.g. rain) cannot be detected');
          if (mounted) setPermissionDenied(true);
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        if (!mounted) return;
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });

        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          if (mounted && place) {
            setResolvedCity(place.city ?? place.subregion ?? place.region ?? null);
          }
        } catch {
          // City name falls back to the weather API's own resolved name below.
        }
      } catch {
        if (mounted) setPermissionDenied(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const query = useQuery({
    queryKey: ['weather', coords?.lat, coords?.lng],
    queryFn: () => fetchWeather(coords!.lat, coords!.lng),
    enabled: !!coords,
    // Conditions (especially rain) can change within minutes — keep this short-lived rather than
    // sticking with a stale "sunny" reading for a long time after it starts raining.
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  });

  if (query.isError) {
    console.warn('[useDeviceWeather] weather fetch failed — falling back to default scenery:', query.error);
  }

  const weather: ApiWeather | null = query.data
    ? { ...query.data, city: resolvedCity ?? query.data.city }
    : null;

  return {
    weather,
    isLoading: !permissionDenied && !weather && (query.isLoading || !coords),
  };
}
