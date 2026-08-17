import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

const createSchema = z.object({
  ngo: z.string().min(1),
  amount: z.number().positive(),
  message: z.string().optional(),
})

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const pledges = await prisma.pledge.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ pledges })
}

export async function POST(request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please choose an NGO and a valid amount.' }, { status: 400 })
  }
  const { ngo, amount, message } = parsed.data

  const pledge = await prisma.pledge.create({
    data: { userId: user.id, ngo, amount, message: message || null },
  })

  if (!isStripeConfigured()) {
    // Payments aren't wired up yet on this deployment — record the pledge without a charge.
    return NextResponse.json({ pledge }, { status: 201 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'inr',
          product_data: { name: `Donation to ${ngo}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { pledgeId: pledge.id },
    success_url: `${siteUrl}/donate/success?pledge=${pledge.id}`,
    cancel_url: `${siteUrl}/donate`,
  })

  await prisma.pledge.update({ where: { id: pledge.id }, data: { stripeSessionId: session.id } })

  return NextResponse.json({ pledge, checkoutUrl: session.url }, { status: 201 })
}
