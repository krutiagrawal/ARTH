import { NextResponse } from 'next/server'
import { proxyToApi, setAuthCookies, clearAuthCookies } from '@/lib/apiProxy'

const ROLE = 'ngo'

async function handle(request, { params }, method) {
  const { path } = await params
  const apiPath = `/api/${path.join('/')}${request.nextUrl.search}`
  const contentType = request.headers.get('content-type') || ''

  let body
  let isForm = false
  if (method !== 'GET' && method !== 'DELETE') {
    if (contentType.includes('multipart/form-data')) {
      body = await request.formData()
      isForm = true
    } else {
      body = await request.json().catch(() => undefined)
    }
  }

  const result = await proxyToApi(request, ROLE, apiPath, { method, body, isForm })

  if (result.status === 204) {
    const response = new NextResponse(null, { status: 204 })
    if (result.newTokens) setAuthCookies(response, ROLE, result.newTokens)
    return response
  }

  // apiClient's apiRequest() returns a plain string for any non-JSON response
  // (e.g. the donations CSV export) — wrapping that in NextResponse.json would
  // double-encode it as a quoted JSON string instead of a real downloadable file.
  const response =
    result.status < 400 && typeof result.data === 'string'
      ? new NextResponse(result.data, { status: result.status, headers: { 'Content-Type': 'text/csv' } })
      : NextResponse.json(result.data, { status: result.status })
  if (result.newTokens) setAuthCookies(response, ROLE, result.newTokens)
  if (result.clearCookies) clearAuthCookies(response, ROLE)
  return response
}

export const GET = (request, ctx) => handle(request, ctx, 'GET')
export const POST = (request, ctx) => handle(request, ctx, 'POST')
export const PATCH = (request, ctx) => handle(request, ctx, 'PATCH')
export const DELETE = (request, ctx) => handle(request, ctx, 'DELETE')
