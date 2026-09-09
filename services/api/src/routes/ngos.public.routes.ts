import { FastifyInstance } from 'fastify';
import * as ngoPublicService from '../services/ngoPublic.service';
import * as followService from '../services/follow.service';
import { browseQuerySchema, paginationQuerySchema } from '../schemas/ngosPublic.schema';
import { BadRequestError } from '../utils/errors';
import { listPublicPortfolio } from '../services/portfolio.service';

interface NgoLeaderboardRow {
  id: string;
  org_name: string;
  logo_url: string | null;
  trees_planted: bigint;
  rank: bigint;
}

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

  // Public ranking by trees planted. Fastify's router always prefers this static path over
  // the `/:id` param route below, so "leaderboard" can never be misread as an ngo id.
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/leaderboard', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = Math.max(Number(request.query.offset) || 0, 0);

    const [rows, total] = await Promise.all([
      fastify.prisma.$queryRaw<NgoLeaderboardRow[]>`
        SELECT n.id, n.org_name, n.logo_url, COUNT(pt.id) AS trees_planted,
               RANK() OVER (ORDER BY COUNT(pt.id) DESC) AS rank
        FROM ngo_profiles n
        LEFT JOIN planted_trees pt ON pt.ngo_id = n.id
        WHERE n.status = 'approved'
        GROUP BY n.id
        ORDER BY trees_planted DESC
        LIMIT ${limit} OFFSET ${offset};
      `,
      fastify.prisma.ngoProfile.count({ where: { status: 'approved' } }),
    ]);

    reply.send({
      entries: rows.map((row) => ({
        rank: Number(row.rank),
        id: row.id,
        orgName: row.org_name,
        logoUrl: row.logo_url,
        treesPlanted: Number(row.trees_planted),
      })),
      total,
      hasMore: offset + rows.length < total,
    });
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

  fastify.get<{ Params: { id: string } }>('/:id/achievements', async (request, reply) => {
    const achievements = await fastify.prisma.ngoAchievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        unlocks: { where: { ngoId: request.params.id } },
      },
    });

    reply.send(
      achievements.map((achievement) => {
        const unlock = achievement.unlocks[0];
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          unlocked: unlock?.unlocked ?? false,
          progress: unlock?.progress ?? 0,
          total: achievement.criteriaTarget ?? undefined,
        };
      }),
    );
  });

  // Read-only accepted-followers list for any visitor — the owner-only inbox with
  // accept/decline/remove lives at /api/ngo/followers (ngoFollowers.routes.ts).
  fastify.get<{ Params: { id: string }; Querystring: { page?: string; take?: string } }>(
    '/:id/followers',
    async (request, reply) => {
      const take = Math.min(Number(request.query.take) || 30, 100);
      const page = Math.max(Number(request.query.page) || 1, 1);
      const where = { ngoId: request.params.id, status: 'accepted' as const };

      const [rows, total] = await Promise.all([
        fastify.prisma.follow.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip: (page - 1) * take,
          include: {
            follower: { select: { id: true, name: true, handle: true, avatarEmoji: true, treesPlantedCount: true } },
          },
        }),
        fastify.prisma.follow.count({ where }),
      ]);

      reply.send({ total, followers: rows.map((f) => f.follower) });
    },
  );

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
