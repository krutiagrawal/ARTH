import { FastifyInstance } from 'fastify';
import { BadRequestError, NotFoundError } from '../utils/errors';

export default async function themesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const themes = await fastify.prisma.forestTheme.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { userForestThemes: { where: { userId: request.user!.id } } },
    });

    reply.send(
      themes.map((theme) => ({
        id: theme.id,
        key: theme.key,
        name: theme.name,
        preview: theme.previewEmoji,
        unlocked: theme.userForestThemes[0]?.unlocked ?? false,
      }))
    );
  });

  fastify.post<{ Params: { id: string } }>('/:id/select', async (request, reply) => {
    const userTheme = await fastify.prisma.userForestTheme.findUnique({
      where: { userId_themeId: { userId: request.user!.id, themeId: request.params.id } },
    });
    if (!userTheme?.unlocked) throw new BadRequestError('Theme is not unlocked');

    const updated = await fastify.prisma.user.update({
      where: { id: request.user!.id },
      data: { selectedForestThemeId: request.params.id },
    });

    reply.send({ selectedForestThemeId: updated.selectedForestThemeId });
  });

  fastify.post<{ Params: { id: string } }>('/:id/unlock', async (request, reply) => {
    const theme = await fastify.prisma.forestTheme.findUnique({ where: { id: request.params.id } });
    if (!theme) throw new NotFoundError('Theme not found');

    const updated = await fastify.prisma.userForestTheme.upsert({
      where: { userId_themeId: { userId: request.user!.id, themeId: theme.id } },
      update: { unlocked: true, unlockedAt: new Date() },
      create: { userId: request.user!.id, themeId: theme.id, unlocked: true, unlockedAt: new Date() },
    });

    reply.send(updated);
  });
}
