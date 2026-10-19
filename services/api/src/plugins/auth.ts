import fp from 'fastify-plugin';
import { UserRole } from '@arth/db';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';
import { AccountBlockedError, AccountNotApprovedError, ForbiddenError, UnauthorizedError } from '../utils/errors';

// NGO / nursery accounts must be admin-approved before they can take any action. Until then they
// are read-only: every GET/HEAD is allowed so they can look around the whole app, and the only
// writes allowed are the ones below (own profile edit, (when rejected) resubmit, account basics).
// Matched against the route pattern (prefix included), not the raw URL.
const UNAPPROVED_ALLOWED: { method: string; test: (url: string) => boolean }[] = [
  { method: 'GET', test: (u) => u === '/api/ngo/profile' || u === '/api/nursery/profile' },
  { method: 'PATCH', test: (u) => u === '/api/ngo/profile' || u === '/api/nursery/profile' },
  { method: 'POST', test: (u) => u === '/api/ngo/resubmit' || u === '/api/nursery/resubmit' },
  { method: '*', test: (u) => u.startsWith('/api/auth/') },
  { method: '*', test: (u) => u === '/api/users/me' || u.startsWith('/api/users/me/') },
  { method: '*', test: (u) => u === '/api/notifications' || u.startsWith('/api/notifications/') },
  { method: '*', test: (u) => u === '/api/push-tokens' || u.startsWith('/api/push-tokens/') },
];

function isAllowedWhenUnapproved(method: string, url: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  return UNAPPROVED_ALLOWED.some((r) => (r.method === '*' || r.method === method) && r.test(url));
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // DB check (not just JWT verification) so a block takes effect on the
    // very next request instead of waiting for the access token to expire.
    const user = await fastify.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isDeleted: true, isBlocked: true },
    });
    if (!user || user.isDeleted) throw new UnauthorizedError('Invalid or expired token');
    if (user.isBlocked) throw new AccountBlockedError();

    // Approval gate for NGO / nursery accounts. Status is read fresh from the DB (like isBlocked) so an
    // admin approve / reject / suspend takes effect on the very next request.
    if (payload.role === 'ngo' || payload.role === 'nursery') {
      const url = request.routeOptions?.url ?? request.url.split('?')[0];
      const profile = payload.role === 'ngo'
        ? await fastify.prisma.ngoProfile.findUnique({ where: { userId: payload.sub }, select: { status: true, rejectionReason: true } })
        : await fastify.prisma.nurseryProfile.findUnique({ where: { userId: payload.sub }, select: { status: true, rejectionReason: true } });
      if (profile && profile.status !== 'approved') {
        // A suspended account may look but not edit or resubmit.
        const editing = request.method === 'PATCH' || request.method === 'POST';
        const ownProfileEdit = /^\/api\/(ngo|nursery)\/(profile|resubmit)$/.test(url);
        const blockedBySuspension = profile.status === 'suspended' && editing && ownProfileEdit;
        if (blockedBySuspension || !isAllowedWhenUnapproved(request.method, url)) {
          throw new AccountNotApprovedError(profile.status, profile.rejectionReason);
        }
      }
    }

    // `lastActiveAt` otherwise only moves on login (auth.service.ts), so a user who stays
    // logged in for weeks would look permanently "inactive" to re-engagement jobs. Refreshed
    // here on every authenticated request, but throttled to once per 10 minutes per user so
    // it doesn't add a write to every request — fire-and-forget, never blocks the response.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    void fastify.prisma.user.updateMany({
      where: { id: payload.sub, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: tenMinutesAgo } }] },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    request.user = { id: payload.sub, email: payload.email, role: payload.role as UserRole };
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
