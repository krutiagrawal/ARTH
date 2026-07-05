import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';

interface LeaderboardRow {
  id: string;
  name: string;
  handle: string;
  avatar_emoji: string;
  trees_planted_count: number;
  streak_current: number;
  rank: bigint;
}

interface RankRow {
  rank: bigint;
}

export default async function leaderboardRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { scope?: 'global' | 'friends'; limit?: string } }>('/', async (request, reply) => {
    const userId = request.user!.id;
    const scope = request.query.scope ?? 'global';
    const limit = Math.min(Number(request.query.limit) || 50, 200);

    let rows: LeaderboardRow[];
    let myRankRows: RankRow[];

    if (scope === 'friends') {
      const friendships = await fastify.prisma.friendship.findMany({
        where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      });
      const friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
      friendIds.push(userId);

      rows = await fastify.prisma.$queryRaw<LeaderboardRow[]>`
        SELECT u.id, u.name, u.handle, u.avatar_emoji, u.trees_planted_count, u.streak_current,
               RANK() OVER (ORDER BY u.trees_planted_count DESC) AS rank
        FROM users u
        WHERE u.id IN (${Prisma.join(friendIds)}) AND u.is_deleted = false
        ORDER BY u.trees_planted_count DESC
        LIMIT ${limit};
      `;

      myRankRows = await fastify.prisma.$queryRaw<RankRow[]>`
        SELECT rank FROM (
          SELECT u.id, RANK() OVER (ORDER BY u.trees_planted_count DESC) AS rank
          FROM users u
          WHERE u.id IN (${Prisma.join(friendIds)}) AND u.is_deleted = false
        ) ranked WHERE id = ${userId};
      `;
    } else {
      rows = await fastify.prisma.$queryRaw<LeaderboardRow[]>`
        SELECT u.id, u.name, u.handle, u.avatar_emoji, u.trees_planted_count, u.streak_current,
               RANK() OVER (ORDER BY u.trees_planted_count DESC) AS rank
        FROM users u
        LEFT JOIN user_settings s ON s.user_id = u.id
        WHERE COALESCE(s.public_profile, true) AND u.is_deleted = false
        ORDER BY u.trees_planted_count DESC
        LIMIT ${limit};
      `;

      myRankRows = await fastify.prisma.$queryRaw<RankRow[]>`
        SELECT rank FROM (
          SELECT u.id, RANK() OVER (ORDER BY u.trees_planted_count DESC) AS rank
          FROM users u
          LEFT JOIN user_settings s ON s.user_id = u.id
          WHERE COALESCE(s.public_profile, true) AND u.is_deleted = false
        ) ranked WHERE id = ${userId};
      `;
    }

    const totalUsers = await fastify.prisma.user.count({ where: { isDeleted: false } });

    reply.send({
      entries: rows.map((row) => ({
        rank: Number(row.rank),
        id: row.id,
        name: row.name,
        handle: row.handle,
        avatar: row.avatar_emoji,
        trees: row.trees_planted_count,
        streak: row.streak_current,
        isUser: row.id === userId,
      })),
      totalUsers,
      myRank: myRankRows[0] ? Number(myRankRows[0].rank) : null,
    });
  });
}
