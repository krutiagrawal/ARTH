// Next.js calls onRequestError() for every unexpected server-side error (a page or route handler that
// threw). It forwards a short report to the API (POST /api/client-errors), which sends it to crash
// reporting when SENTRY_DSN is set there. Plain fetch on purpose: the Sentry SDK doesn't bundle cleanly
// into Next's instrumentation file, and this keeps one place holding the reporting key.
const API_URL = process.env.API_URL || 'http://localhost:4000'

export async function onRequestError(error, request, context) {
  try {
    const err = error instanceof Error ? error : new Error(String(error))
    await fetch(`${API_URL}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: (err.message || err.name || 'Unknown error').slice(0, 500),
        stack: err.stack?.slice(0, 4000),
        screen: String(context?.routePath || request?.path || 'unknown').slice(0, 100),
        platform: 'web-server',
        fatal: false,
      }),
    })
  } catch {
    // Reporting must never be the thing that breaks a page.
  }
}
