import { FastifyInstance } from 'fastify';
import { updateSettingsSchema } from '../schemas/users.schema';
import { BadRequestError } from '../utils/errors';

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const settings = await fastify.prisma.userSettings.upsert({
      where: { userId: request.user!.id },
      update: {},
      create: { userId: request.user!.id },
    });
    reply.send(settings);
  });

  fastify.patch('/', async (request, reply) => {
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const settings = await fastify.prisma.userSettings.upsert({
      where: { userId: request.user!.id },
      update: parsed.data,
      create: { userId: request.user!.id, ...parsed.data },
    });

    reply.send(settings);
  });
}
