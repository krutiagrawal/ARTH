// Minimal in-memory rate limiter for public form endpoints (contact, newsletter). The web app runs as a
// single process (see deploy/ecosystem.config.js), so a Map is enough; counts reset on restart.
const buckets = new Map()

export function clientIp(request) {
  // nginx puts the real visitor address last; anything a visitor sent themselves sits before it.
  const parts = (request.headers.get('x-forwarded-for') || '').split(',').map((p) => p.trim()).filter(Boolean)
  return parts[parts.length - 1] || 'unknown'
}

// Returns true when the caller has used up its allowance of `max` hits per `windowMs`.
export function isRateLimited(key, max, windowMs) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    return false
  }
  bucket.count += 1
  return bucket.count > max
}
