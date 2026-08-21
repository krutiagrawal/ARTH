import Stripe from 'stripe';
import { env } from '../config/env';
import { ServiceUnavailableError } from '../utils/errors';

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableError('Donations are not available yet — Stripe is not configured.');
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return client;
}
