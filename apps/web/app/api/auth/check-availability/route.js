import { NextResponse } from 'next/server'
import { apiRequest, ApiError } from '@/lib/apiClient'

// Public, unauthenticated proxy to services/api's GET /api/auth/check-availability — every
// registration form (individual/NGO/group/nursery) needs to flag "already taken" while the user
// is still typing, not just on submit. The backend itself needs no auth for this endpoint, but the
// browser can't call it directly (API_URL isn't a NEXT_PUBLIC_ var), so this thin route forwards it.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams()
  for (const key of ['email', 'phone', 'handle']) {
    const value = searchParams.get(key)
    if (value) params.set(key, value)
  }

  if ([...params.keys()].length === 0) {
    return NextResponse.json({ error: 'Provide at least one of email, phone, or handle' }, { status: 400 })
  }

  try {
    const data = await apiRequest(`/api/auth/check-availability?${params.toString()}`)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
