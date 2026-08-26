import { FastifyInstance } from 'fastify';
import * as ngoPublicService from '../services/ngoPublic.service';
import * as followService from '../services/follow.service';
import { browseQuerySchema, paginationQuerySchema } from '../schemas/ngosPublic.schema';
import { BadRequestError } from '../utils/errors';
import { listPublicPortfolio } from '../services/portfolio.service';

function serializeNgoSummary(n: any) {
  return { id: n.id, orgName: n.orgName, description: n.description, logoUrl: n.logoUrl, city: n.city };
}

function serializeDrive(d: any) {
  return { id: d.id, title: d.title, photoUrl: d.photoUrl, city: d.city, startsAt: d.startsAt, featured: d.featured };
}

export default async function ngosPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = browseQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { total, ngos } = await ngoPublicService.browseNgos(fastify.prisma, parsed.data);
    reply.send({ total, ngos: ngos.map(serializeNgoSummary) });
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      const profile = await ngoPublicService.getPublicProfile(fastify.prisma, request.params.id, request.user?.id);
      // recentUpdates / portfolio / staff arrive already serialized from the service.
      reply.send({ ...profile, featuredDrives: profile.featuredDrives.map(serializeDrive) });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id/updates', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const updates = await ngoPublicService.listPublicUpdatesForNgo(fastify.prisma, request.params.id, parsed.data);
    reply.send(updates);
  });

  // Past work, shown on the public profile alongside completed drives.
  fastify.get<{ Params: { id: string } }>('/:id/portfolio', async (request, reply) => {
    reply.send(await listPublicPortfolio(fastify.prisma, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>(
    '/:id/follow',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      // Returns { status, followersCount } rather than the old bare 204, so the client can
      // render "Following" vs "Requested" without guessing. apps/web ignores the body, so its
      // existing follow button is unaffected.
      reply.send(await followService.followNgo(fastify.prisma, request.user!.id, request.params.id));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id/follow',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      reply.send(await followService.unfollowNgo(fastify.prisma, request.user!.id, request.params.id));
    },
  );
}
