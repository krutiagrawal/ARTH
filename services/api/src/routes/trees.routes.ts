import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { plantTreeSchema, updateTreeSchema } from '../schemas/trees.schema';
import { saveTreePhoto } from '../services/upload.service';
import { plantTree } from '../services/tree.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

function serializeTree(tree: any) {
  return {
    id: tree.id,
    species: tree.species?.commonName,
    speciesId: tree.speciesId,
    speciesEmoji: tree.species?.emoji,
    nickname: tree.nickname,
    plantedAt: tree.plantedAt,
    location: tree.locationLabel,
    lat: Number(tree.lat),
    lng: Number(tree.lng),
    growthStage: tree.growthStage,
    photoUri: tree.photoUrl,
    co2Absorbed: Number(tree.co2Absorbed),
    xpEarned: tree.xpEarned,
  };
}

export default async function treesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { limit?: string; page?: string } }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 50, 100);
    const page = Math.max(Number(request.query.page) || 1, 1);

    const trees = await fastify.prisma.tree.findMany({
      where: { userId: request.user!.id, isDeleted: false },
      include: { species: true },
      orderBy: { plantedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    reply.send(trees.map(serializeTree));
  });

  fastify.get<{ Querystring: { scope?: 'mine' | 'global' } }>('/map', async (request, reply) => {
    const scope = request.query.scope ?? 'mine';
    const trees = await fastify.prisma.tree.findMany({
      where: scope === 'mine' ? { userId: request.user!.id, isDeleted: false } : { isDeleted: false },
      include: { species: true },
      take: 500,
    });

    reply.send(trees.map(serializeTree));
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tree = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
      include: { species: true },
    });
    if (!tree) throw new NotFoundError('Tree not found');
    reply.send(serializeTree(tree));
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as Record<string, MultipartFile | { value: string }>;

    const fields: Record<string, string> = {};
    let photoFile: MultipartFile | undefined;

    for (const [key, part] of Object.entries(body ?? {})) {
      if ((part as MultipartFile).file !== undefined || (part as MultipartFile).toBuffer) {
        if (key === 'photo') photoFile = part as MultipartFile;
      } else {
        fields[key] = (part as { value: string }).value;
      }
    }

    const parsed = plantTreeSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (photoFile) {
      const buffer = await photoFile.toBuffer();
      photoUrl = await saveTreePhoto({
        filename: photoFile.filename,
        mimetype: photoFile.mimetype,
        buffer,
      });
    }

    const tree = await plantTree(fastify.prisma, {
      userId: request.user!.id,
      speciesId: parsed.data.speciesId,
      nickname: parsed.data.nickname,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      locationLabel: parsed.data.locationLabel,
      photoUrl,
    });

    reply.status(201).send(serializeTree(tree));
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateTreeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const existing = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundError('Tree not found');

    const updated = await fastify.prisma.tree.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { species: true },
    });

    reply.send(serializeTree(updated));
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundError('Tree not found');

    await fastify.prisma.tree.update({ where: { id: existing.id }, data: { isDeleted: true } });
    reply.status(204).send();
  });
}
