import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  accountType: z.enum(['individual', 'community', 'ngo', 'nursery', 'organisation']),
  place: z.string().optional(),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration details.' }, { status: 400 })
  }

  const { email, password, name, accountType, place } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, passwordHash, name, accountType, place: place || null },
  })

  const token = await signSession(user)
  const { passwordHash: _omit, ...safeUser } = user

  const response = NextResponse.json({ user: safeUser })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
