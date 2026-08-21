import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { setAuthCookies } from '@/lib/apiProxy'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input.' }, { status: 400 })

  try {
    const data = await apiRequest('/api/auth/register', { method: 'POST', body: parsed.data })
    const response = NextResponse.json({ user: data.user })
    setAuthCookies(response, 'member', data)
    return response
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
