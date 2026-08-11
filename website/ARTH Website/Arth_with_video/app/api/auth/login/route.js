import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const token = await signSession(user)
  const { passwordHash: _omit, ...safeUser } = user

  const response = NextResponse.json({ user: safeUser })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
}
