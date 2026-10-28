// The ?next= value on a login page comes from the URL, so anyone can craft a link to /login?next=https://evil.test
// and have the visitor land on a look-alike site right after signing in. Only same-site paths are allowed.
export function safeNextPath(value, fallback) {
  if (typeof value !== 'string') return fallback
  // Must start with a single "/" — "//host" and "/\host" are protocol-relative and would leave the site.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\')) return fallback
  return value
}
