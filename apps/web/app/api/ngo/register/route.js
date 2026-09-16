import { NextResponse } from 'next/server'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { setAuthCookies } from '@/lib/apiProxy'

// Unlike nursery (which still has to support an older JSON-only web form with no photo), the NGO
// wizard was rebuilt fresh as part of this feature with no legacy client to preserve — it always
// submits multipart/form-data, since the mandatory authorization-proof upload can't travel over a
// plain JSON body anyway. Only the handful of always-required fields are checked here; every
// other field's validation lives in the backend's registerNgoSchema, the single source of truth,
// rather than being hand-duplicated a second time in this route.
const REQUIRED_FIELDS = ['email', 'password', 'name', 'handle', 'orgName', 'description']

export async function POST(request) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'NGO registration must be submitted as multipart/form-data.' }, { status: 400 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 })
  }

  for (const field of REQUIRED_FIELDS) {
    if (!formData.get(field)) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  try {
    const data = await apiRequest('/api/auth/register-ngo', { method: 'POST', body: formData, isForm: true })
    const response = NextResponse.json({ user: data.user })
    setAuthCookies(response, 'ngo', data)
    return response
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
