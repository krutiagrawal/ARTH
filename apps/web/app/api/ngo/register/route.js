import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest, ApiError } from '@/lib/apiClient'
import { setAuthCookies } from '@/lib/apiProxy'

// Prepends https:// when the user typed a bare domain (e.g. "www.example.com") instead of a
// full URL — the plain z.string().url() rejects that outright even though it's the natural
// thing to type into a "Website" field.
const websiteUrl = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}, z.string().url().optional().or(z.literal('')))

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  handle: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  orgName: z.string().min(1),
  description: z.string().min(1),
  website: websiteUrl,
  contactPhone: z.string().optional(),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input.' }, { status: 400 })
  }

  try {
    const data = await apiRequest('/api/auth/register-ngo', {
      method: 'POST',
      body: { ...parsed.data, website: parsed.data.website || undefined },
    })
    const response = NextResponse.json({ user: data.user })
    setAuthCookies(response, 'ngo', data)
    return response
  } catch (err) {
    if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
