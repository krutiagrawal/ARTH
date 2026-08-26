import { FastifyInstance } from 'fastify';
import { requireOwnGroup } from '../services/group.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Group-scoped mirror of themes.routes.ts — Group doesn't have an individual Skia-rendered
// forest to re-skin the way a User does, so a selected theme only tints the group's own
// dashboard/profile chrome (see GroupProfileScreen.tsx on the mobile side).
export default async function groupThemesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('group'));

  fastify.get('/', async (request, reply) => {
    const group = await requireOwnGroup(fastify.prisma, request.user!.id);

    const themes = await fastify.prisma.forestTheme.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { groupForestThemes: { where: { groupId: group.id } } },
    });

    reply.send(
      themes.map((theme) => ({
        id: theme.id,
        key: theme.key,
        name: theme.name,
        preview: theme.previewEmoji,
        // Falls back to the theme's own default rather than `false` so groups created before this
        // feature existed (no seeded GroupForestTheme rows) still see their default-unlocked themes.
        unlocked: theme.groupForestThemes[0]?.unlocked ?? theme.isDefaultUnlocked,
      }))
    );
  });

  fastify.post<{ Params: { id: string } }>('/:id/select', async (request, reply) => {
    const group = await requireOwnGroup(fastify.prisma, request.user!.id);

    const theme = await fastify.prisma.forestTheme.findUnique({ where: { id: request.params.id } });
    if (!theme) throw new NotFoundError('Theme not found');

    const groupTheme = await fastify.prisma.groupForestTheme.findUnique({
      where: { groupId_themeId: { groupId: group.id, themeId: request.params.id } },
    });
    if (!(groupTheme?.unlocked ?? theme.isDefaultUnlocked)) throw new BadRequestError('Theme is not unlocked');

    const updated = await fastify.prisma.groupProfile.update({
      where: { id: group.id },
      data: { selectedForestThemeId: request.params.id },
    });

    reply.send({ selectedForestThemeId: updated.selectedForestThemeId });
  });

  fastify.post<{ Params: { id: string } }>('/:id/unlock', async (request, reply) => {
    const group = await requireOwnGroup(fastify.prisma, request.user!.id);

    const theme = await fastify.prisma.forestTheme.findUnique({ where: { id: request.params.id } });
    if (!theme) throw new NotFoundError('Theme not found');

    const updated = await fastify.prisma.groupForestTheme.upsert({
      where: { groupId_themeId: { groupId: group.id, themeId: theme.id } },
      update: { unlocked: true, unlockedAt: new Date() },
      create: { groupId: group.id, themeId: theme.id, unlocked: true, unlockedAt: new Date() },
    });

    reply.send(updated);
  });
}
