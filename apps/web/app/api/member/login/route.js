import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { setAuthCookies } from '@/lib/apiProxy'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })

  try {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: parsed.data })
    const response = NextResponse.json({ user: data.user })
    setAuthCookies(response, 'member', data)
    return response
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
