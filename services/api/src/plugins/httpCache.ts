import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';

/**
 * Two layers of read caching for GET JSON responses:
 *
 * 1. Conditional requests (all GETs): every 200 JSON response carries a weak ETag, and a matching
 *    If-None-Match gets a body-less 304. This saves bandwidth, not DB work (the handler still runs).
 *
 * 2. A short-TTL in-memory response cache for anonymous (no Authorization header) requests to the
 *    public catalogue routes. These are identical for every visitor, so one DB read serves everyone
 *    for CACHE_TTL_MS. Any successful write anywhere flushes it, so a visitor never sees stale data
 *    longer than the next write; the TTL only bounds staleness from writes on other instances.
 *    Authenticated responses are never stored: they are per-user and several (order status
 *    polling, notifications) need to be fresh.
 */
const CACHE_TTL_MS = 30_000;
const MAX_ENTRIES = 500;
const PUBLIC_PREFIXES = [
  '/api/ngos',
  '/api/nurseries',
  '/api/species',
  '/api/cities',
  '/api/eco-facts',
  '/api/community',
  '/api/challenges',
  '/api/competitions',
];

interface CachedResponse {
  payload: string;
  etag: string;
  expires: number;
}

function isPublicCacheable(method: string, url: string, authorization: string | undefined) {
  return method === 'GET' && !authorization && PUBLIC_PREFIXES.some((p) => url === p || url.startsWith(p + '/') || url.startsWith(p + '?'));
}

export default fp(async function httpCachePlugin(fastify: FastifyInstance) {
  const cache = new Map<string, CachedResponse>();

  fastify.addHook('onRequest', async (request, reply) => {
    if (!isPublicCacheable(request.method, request.url, request.headers.authorization)) return;
    const hit = cache.get(request.url);
    if (!hit) return;
    if (hit.expires < Date.now()) {
      cache.delete(request.url);
      return;
    }
    reply.header('ETag', hit.etag).header('Cache-Control', 'public, max-age=30').header('X-Cache', 'HIT');
    if (request.headers['if-none-match'] === hit.etag) {
      return reply.code(304).send();
    }
    return reply.type('application/json; charset=utf-8').send(hit.payload);
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET' || reply.statusCode !== 200 || typeof payload !== 'string') return payload;
    if (!String(reply.getHeader('content-type') ?? '').includes('application/json')) return payload;

    const etag = `W/"${createHash('sha1').update(payload).digest('base64url')}"`;
    reply.header('ETag', etag);

    const cacheable = isPublicCacheable(request.method, request.url, request.headers.authorization);
    if (!reply.getHeader('cache-control')) {
      reply.header('Cache-Control', cacheable ? 'public, max-age=30' : 'private, no-cache');
    }

    if (cacheable && reply.getHeader('x-cache') !== 'HIT') {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(request.url, { payload, etag, expires: Date.now() + CACHE_TTL_MS });
    }

    if (request.headers['if-none-match'] === etag) {
      reply.code(304);
      return '';
    }
    return payload;
  });

  // Any successful write may change what a public list shows, so drop everything.
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS' && reply.statusCode < 400) {
      cache.clear();
    }
  });
});
