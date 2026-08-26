import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest, ApiError } from '@/lib/apiClient'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a token and a password of at least 8 characters.' }, { status: 400 })
  }

  try {
    await apiRequest('/api/auth/reset-password', { method: 'POST', body: parsed.data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
