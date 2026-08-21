import { FastifyInstance } from 'fastify';
import { env } from '../config/env';
import { handleStripeWebhookEvent } from '../services/donation.service';
import { BadRequestError, ServiceUnavailableError } from '../utils/errors';

// Registered as its own encapsulated plugin (see app.ts) so this raw-body
// content-type parser override applies only to this route, not globally.
export default async function donationsWebhookRoutes(fastify: FastifyInstance) {
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  fastify.post('/webhook', async (request, reply) => {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new ServiceUnavailableError('Stripe webhook is not configured.');

    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string') throw new BadRequestError('Missing Stripe signature header');

    try {
      await handleStripeWebhookEvent(fastify.prisma, request.body as Buffer, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new BadRequestError(err instanceof Error ? err.message : 'Invalid webhook payload');
    }

    reply.status(204).send();
  });
}
