import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { clientIp, isRateLimited } from '@/lib/rateLimit'

const subscribeSchema = z.object({
  email: z.string().email(),
})

export async function POST(request) {
  if (isRateLimited(`newsletter:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    update: {},
    create: { email: parsed.data.email },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
