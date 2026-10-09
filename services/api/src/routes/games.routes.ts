import { FastifyInstance } from 'fastify';
import { gameKeySchema, guessSchema, submitGameSchema } from '../schemas/games.schema';
import { getGamesStatus, getTodayGame, submitGuess, submitAnswers } from '../services/games.service';
import { BadRequestError } from '../utils/errors';

function parseKey(raw: string) {
  const parsed = gameKeySchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError('Unknown game');
  return parsed.data;
}

export default async function gamesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const status = await fastify.prisma.$transaction((tx) => getGamesStatus(tx, request.user!.id));
    reply.send(status);
  });

  fastify.get<{ Params: { key: string } }>('/:key/today', async (request, reply) => {
    const key = parseKey(request.params.key);
    const game = await fastify.prisma.$transaction((tx) => getTodayGame(tx, request.user!.id, key));
    reply.send(game);
  });

  fastify.post<{ Params: { key: string } }>('/:key/guess', async (request, reply) => {
    const key = parseKey(request.params.key);
    const parsed = guessSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await fastify.prisma.$transaction((tx) => submitGuess(tx, request.user!.id, key, parsed.data.guess));
    reply.send(result);
  });

  fastify.post<{ Params: { key: string } }>('/:key/submit', async (request, reply) => {
    const key = parseKey(request.params.key);
    const parsed = submitGameSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await fastify.prisma.$transaction((tx) => submitAnswers(tx, request.user!.id, key, parsed.data));
    reply.send(result);
  });
}
