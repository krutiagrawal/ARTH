// Cross-origin client for services/api (the Fastify backend apps/mobile uses).
// Distinct from lib/prisma.js, which talks to this app's own Arth database.
import { headers as requestHeaders } from 'next/headers'

const API_URL = process.env.API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiRequest(path, { method = 'GET', body, token, isForm = false } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  // The API sees this server as its caller, so pass along the real visitor's IP (set by nginx) — otherwise
  // the API's per-IP rate limits would count every website visitor as one person.
  try {
    const forwarded = (await requestHeaders()).get('x-forwarded-for')
    if (forwarded) headers['X-Forwarded-For'] = forwarded
  } catch {
    // Called outside a request (build time, scripts): nothing to forward.
  }

  let payload
  if (body !== undefined) {
    if (isForm) {
      payload = body
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    // The backend is unreachable (down, wrong port, etc.) – distinct from a
    // real API error response, and specifically NOT a 401, so callers like
    // NgoProfileContext don't mistake "server is down" for "you're logged out".
    throw new ApiError(503, 'Could not reach the API server.', 'API_UNREACHABLE')
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const message = (data && data.message) || 'Something went wrong.'
    const code = data && data.error
    throw new ApiError(res.status, message, code)
  }

  return data
}
