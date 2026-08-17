import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, hashResetToken } from '@/lib/auth'

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

  const tokenHash = hashResetToken(parsed.data.token)
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  const passwordHash = await hashPassword(parsed.data.password)

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true })
}
