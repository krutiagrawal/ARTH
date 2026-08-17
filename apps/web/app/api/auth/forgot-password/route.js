import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateResetToken, hashResetToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

const schema = z.object({ email: z.string().email() })

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })

  if (user) {
    const token = generateResetToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Reset your ARTH password',
      html: `<p>Hi ${user.name},</p><p>Someone requested a password reset for your ARTH account. If this was you, click the link below — it expires in an hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    })
  }

  // Always return 200 — don't reveal whether an account exists for this email.
  return NextResponse.json({ ok: true })
}
