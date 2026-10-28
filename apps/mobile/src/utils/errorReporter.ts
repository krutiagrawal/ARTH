import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../api/client';

// Sends uncaught JavaScript errors to the API (POST /api/client-errors), which forwards them to crash
// reporting. Deliberately plain fetch + JS only: a native crash SDK would force everyone to reinstall the
// APK. Native-level crashes (app killed by the OS) are not covered by this.
const MAX_REPORTS_PER_SESSION = 10;
const seen = new Set<string>();
let sent = 0;
let installed = false;

export function reportError(error: unknown, screen?: string, fatal = false) {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    const key = `${err.name}:${err.message}`;
    // One report per distinct error, and a hard cap, so a render loop can't flood the server.
    if (seen.has(key) || sent >= MAX_REPORTS_PER_SESSION) return;
    seen.add(key);
    sent += 1;

    void fetch(`${API_URL}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: err.message.slice(0, 500) || err.name,
        stack: err.stack?.slice(0, 4000),
        screen,
        appVersion: Constants.expoConfig?.version,
        platform: Platform.OS,
        fatal,
      }),
    }).catch(() => {});
  } catch {
    // Reporting must never be the thing that crashes the app.
  }
}

export function installErrorReporter() {
  if (installed) return;
  installed = true;

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, isFatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, undefined, !!isFatal);
    previous(error, isFatal);
  });
}
