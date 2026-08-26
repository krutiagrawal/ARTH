import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiRequest } from '@/lib/apiClient'

const schema = z.object({ email: z.string().email() })

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })

  // Always 200 regardless of outcome — services/api itself never reveals whether
  // the account exists, and we don't want a network hiccup to do so either.
  await apiRequest('/api/auth/forgot-password', { method: 'POST', body: parsed.data }).catch(() => {})

  return NextResponse.json({ ok: true })
}
