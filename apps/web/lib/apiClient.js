// Cross-origin client for services/api (the Fastify backend apps/mobile uses).
// Distinct from lib/prisma.js, which talks to this app's own Arth database.
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

  let payload
  if (body !== undefined) {
    if (isForm) {
      payload = body
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })

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
