import * as Sentry from '@sentry/node';
import { env } from '../config/env';

// Crash/error reporting. Entirely off unless SENTRY_DSN is set in the server's .env.api, so local
// development and CI behave exactly as before. Personal data is never attached on purpose.
let enabled = false;

export function initSentry() {
  if (!env.SENTRY_DSN || enabled) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Request headers can carry the login token and request bodies can carry passwords: drop both.
    beforeSend(event) {
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
  enabled = true;
}

export function isSentryEnabled() {
  return enabled;
}

/** Reports an unexpected server error (HTTP 5xx). Expected 4xx errors are never sent. */
export function captureServerError(error: unknown, context: { method?: string; route?: string; userId?: string }) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('source', 'api');
    if (context.method) scope.setTag('method', context.method);
    if (context.route) scope.setTag('route', context.route);
    if (context.userId) scope.setUser({ id: context.userId });
    Sentry.captureException(error);
  });
}

export interface ClientErrorReport {
  message: string;
  stack?: string;
  screen?: string;
  appVersion?: string;
  platform?: string;
  fatal?: boolean;
  userId?: string;
}

/** Forwards a JavaScript error caught inside the mobile app (or the Next.js web server, platform 'web-server'). */
export function captureClientError(report: ClientErrorReport) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('source', report.platform === 'web-server' ? 'web' : 'mobile');
    if (report.platform) scope.setTag('platform', report.platform);
    if (report.appVersion) scope.setTag('app_version', report.appVersion);
    if (report.screen) scope.setTag('screen', report.screen);
    scope.setLevel(report.fatal ? 'fatal' : 'error');
    if (report.userId) scope.setUser({ id: report.userId });
    const error = new Error(report.message);
    error.name = 'MobileError';
    if (report.stack) error.stack = report.stack;
    Sentry.captureException(error);
  });
}

export async function flushSentry() {
  if (enabled) await Sentry.close(2000);
}
