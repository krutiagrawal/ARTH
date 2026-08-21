import fp from 'fastify-plugin';
import { UserRole } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role as UserRole };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  fastify.decorate('requireRole', function (...roles: UserRole[]) {
    return async function (request: FastifyRequest, _reply: FastifyReply) {
      if (!request.user || !roles.includes(request.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }
    };
  });

  // Like authenticate, but never throws — sets request.user if a valid bearer
  // token is present, otherwise leaves it undefined. For public routes (e.g.
  // an NGO's public profile) that want to personalize the response (isFollowing)
  // for a logged-in visitor without gating the whole route behind auth.
  fastify.decorate('optionalAuthenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return;

    const token = header.slice('Bearer '.length);
    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role as UserRole };
    } catch {
      // Invalid/expired token on an optional route — treat as anonymous, don't throw.
    }
  });
});
