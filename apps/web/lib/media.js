// services/api stores uploaded photos (posts, logos, tree/drive photos, sapling
// stock) as paths relative to its own origin (e.g. "/uploads/posts/xyz.jpg").
// The web app runs on a different origin/port, so those paths need the API's
// origin prepended before a plain <img> tag can load them.
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export function resolveMediaUrl(url) {
  if (!url) return url
  if (/^(https?:|blob:|data:)/i.test(url)) return url
  return `${API_ORIGIN}${url}`
}
