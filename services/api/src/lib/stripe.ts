import Stripe from 'stripe';
import { env } from '../config/env';
import { ServiceUnavailableError } from '../utils/errors';

let client: Stripe | null = null;

/**
 * Returns the Stripe client, or null ONLY outside production when Stripe isn't configured, so local
 * development can run the order/donation flows without keys. In production a missing key is an error,
 * never a free checkout: callers treat null as "skip payment", so failing open here would give away orders.
 */
export function getStripeClientOrDevBypass(): Stripe | null {
  try {
    return getStripeClient();
  } catch (e) {
    if (e instanceof ServiceUnavailableError && env.NODE_ENV !== 'production') return null;
    throw e;
  }
}

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ServiceUnavailableError('Donations are not available yet — Stripe is not configured.');
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return client;
}
