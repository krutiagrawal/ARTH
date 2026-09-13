import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { getCurrentPositionWithTimeout } from '../utils/location';
import { useMyDeliveryQueue, useReportDeliveryLocation } from './useApiQueries';

const REPORT_INTERVAL_MS = 12_000;

/**
 * Foreground-only GPS reporting for the delivery partner's active queue. Background tracking is
 * explicitly out of scope for this pass (no background-location permission/infra) — reporting
 * runs only while the app is in the foreground and the partner has at least one order they've
 * actually tapped "Start delivery" on (an assigned-but-not-started order stays silent — see
 * deliveryPartner.service.ts's reportLocation), and stops the moment either condition stops
 * holding. Mount once at the top of DeliveryPartnerMainApp so it survives the partner switching
 * between the Queue/Profile tabs.
 */
export function useDeliveryLocationReporting() {
  const { data: queue } = useMyDeliveryQueue();
  const reportMutation = useReportDeliveryLocation();
  const hasActiveDeliveries = (queue ?? []).some((item) => item.startedAt != null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let permissionGranted = false;

    const reportOnce = async () => {
      if (!permissionGranted || appStateRef.current !== 'active') return;
      try {
        const loc = await getCurrentPositionWithTimeout({ accuracy: Location.Accuracy.Balanced });
        await reportMutation.mutateAsync({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        // A single missed report is fine — the next interval tick tries again.
      }
    };

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      permissionGranted = status === 'granted';
      if (!permissionGranted || !hasActiveDeliveries) return;

      await reportOnce();
      intervalRef.current = setInterval(reportOnce, REPORT_INTERVAL_MS);
    };

    if (hasActiveDeliveries) {
      start();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveDeliveries]);
}
