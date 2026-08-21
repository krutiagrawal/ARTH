import { NextResponse } from 'next/server'
import { proxyToApi, setAuthCookies, clearAuthCookies } from '@/lib/apiProxy'

const ROLE = 'member'

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

  const response = NextResponse.json(result.data, { status: result.status })
  if (result.newTokens) setAuthCookies(response, ROLE, result.newTokens)
  if (result.clearCookies) clearAuthCookies(response, ROLE)
  return response
}

export const GET = (request, ctx) => handle(request, ctx, 'GET')
export const POST = (request, ctx) => handle(request, ctx, 'POST')
export const PATCH = (request, ctx) => handle(request, ctx, 'PATCH')
export const DELETE = (request, ctx) => handle(request, ctx, 'DELETE')
