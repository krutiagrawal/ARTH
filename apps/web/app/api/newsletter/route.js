import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const subscribeSchema = z.object({
  email: z.string().email(),
})

export async function POST(request) {
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
