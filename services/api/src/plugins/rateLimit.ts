import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';

// Mobile users on a carrier share one public IP (CGNAT), so a plain per-IP bucket would lock out
// innocent neighbours. A signed-in caller is bucketed by their own token instead; only anonymous
// callers fall back to the IP.
function callerKey(request: FastifyRequest): string {
  const auth = request.headers.authorization;
  if (auth) return `tok:${crypto.createHash('sha1').update(auth).digest('hex').slice(0, 20)}`;
  return `ip:${request.ip}`;
}

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: true,
    max: 600,
    timeWindow: '1 minute',
    keyGenerator: callerKey,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: `Too many requests. Please wait ${Math.ceil(context.ttl / 1000)} seconds and try again.`,
    }),
  });
});

/** Per-route limit config, spread into a route's options: `fastify.post('/x', limit(5, '1 hour'), handler)`. */
export function limit(max: number, timeWindow: string) {
  return { config: { rateLimit: { max, timeWindow } } };
}

/**
 * Limit keyed by IP *and* a field in the JSON body (e.g. the email being logged into), so an attacker
 * can't hammer one account, yet one shared IP can still serve many different people. Runs in
 * preHandler because the body isn't parsed yet at onRequest.
 */
export function limitByBodyField(max: number, timeWindow: string, field: string) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow,
        hook: 'preHandler' as const,
        keyGenerator: (request: FastifyRequest) => {
          const body = request.body as Record<string, unknown> | undefined;
          const value = typeof body?.[field] === 'string' ? (body[field] as string).toLowerCase() : '';
          return `${request.ip}:${field}:${value}`;
        },
      },
    },
  };
}

/**
 * Limit keyed by a URL param alone (e.g. an order id), for short codes that can be guessed per-record.
 * Deliberately ignores IP/user so rotating either doesn't reset the attempt budget for that record.
 */
export function limitByParam(max: number, timeWindow: string, param: string) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow,
        keyGenerator: (request: FastifyRequest) => {
          const params = request.params as Record<string, string> | undefined;
          return `${param}:${params?.[param] ?? ''}`;
        },
      },
    },
  };
}

export const noRateLimit = { config: { rateLimit: false as const } };
