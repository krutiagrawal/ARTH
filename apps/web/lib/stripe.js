import Stripe from 'stripe'

let client = null

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Donations are not available yet — Stripe is not configured.')
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
