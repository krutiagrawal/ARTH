import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { setAuthCookies } from '@/lib/apiProxy'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  handle: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  groupName: z.string().min(1),
  groupType: z.enum(['family', 'school', 'club', 'other']).default('other'),
  description: z.string().min(1),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  try {
    const data = await apiRequest('/api/auth/register-group', { method: 'POST', body: parsed.data })
    const response = NextResponse.json({ user: data.user })
    setAuthCookies(response, 'group', data)
    return response
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
