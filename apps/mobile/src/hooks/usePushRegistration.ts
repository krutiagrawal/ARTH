import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../api/social';

/**
 * Registers this device for Expo push notifications, once per signed-in session.
 *
 * Deliberately silent about every failure. Push is a bonus on top of the in-app notification
 * centre, which works everywhere — so a missing module, a denied permission, or an offline
 * device must never surface an error or block the app.
 *
 * Notably a no-op in Expo Go: Expo removed remote push from the Go client on iOS in SDK 53, and
 * `expo-notifications` isn't part of the Go runtime here at all. Day-to-day development therefore
 * runs on the in-app centre and its unread badge; real delivery needs an EAS dev/production build,
 * where this hook starts working with no further changes.
 */
export function usePushRegistration() {
  const { isAuthenticated } = useAuth();
  // Guards against re-registering on every auth-state re-render.
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;

    let cancelled = false;

    (async () => {
      try {
        if (Constants.appOwnership === 'expo') {
          // Expo Go: no remote push. Bail out before even importing expo-notifications —
          // just loading the module in Expo Go on SDK 53+ prints a red ERROR log (Expo's own
          // deprecation notice), even though nothing here would call its APIs anyway.
          return;
        }

        // Required imports are resolved lazily so the bundle still runs in Expo Go, where the
        // native module is absent — a top-level import would throw at startup.
        const Notifications = await import('expo-notifications').catch(() => null);
        if (!Notifications || cancelled) return;

        const settings = await Notifications.getPermissionsAsync();
        let granted = settings.granted;
        if (!granted && settings.canAskAgain) {
          granted = (await Notifications.requestPermissionsAsync()).granted;
        }
        if (!granted || cancelled) return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!token || cancelled) return;

        await registerPushToken(token, Platform.OS);
        registered.current = true;
      } catch (error) {
        // Never surfaced: the notification centre is the guaranteed path.
        console.warn('[push] registration skipped:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
