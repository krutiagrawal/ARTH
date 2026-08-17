import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe'

export async function POST(request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripeClient()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  // Fulfillment lives here, never on the success page — a customer can pay and never
  // see the redirect. Both completed and async-succeeded need the payment_status check:
  // delayed payment methods fire "completed" while still unpaid, then confirm later.
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object
    if (session.payment_status !== 'unpaid') {
      await prisma.pledge.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: 'paid', stripePaymentIntentId: session.payment_intent || null },
      })
    }
  } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
    const session = event.data.object
    await prisma.pledge.updateMany({
      where: { stripeSessionId: session.id },
      data: { status: 'failed' },
    })
  }

  return new NextResponse(null, { status: 204 })
}
