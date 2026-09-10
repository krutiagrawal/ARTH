import { FastifyInstance } from 'fastify';
import { createSpeciesSchema } from '../schemas/species.schema';
import { BadRequestError } from '../utils/errors';

export default async function speciesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const species = await fastify.prisma.treeSpecies.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    reply.send(species);
  });
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'species';
}

/** Registered separately (see app.ts) so only this write needs a signed-in user — the list itself
 * stays public. Any planter can add a species missing from the list; it's shared immediately so
 * the next person to search for it (or that same planter, next time) finds it already there. */
export async function speciesAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const parsed = createSpeciesSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const commonName = parsed.data.commonName.trim();
    const baseKey = slugify(commonName);

    // A second planter typing the same name (any casing) reuses the first one's row rather than
    // spawning a near-duplicate species — findFirst on the case-insensitive name catches that even
    // when the generated key would otherwise collide and get a suffix.
    const existing = await fastify.prisma.treeSpecies.findFirst({
      where: { commonName: { equals: commonName, mode: 'insensitive' } },
    });
    if (existing) {
      reply.status(200).send(existing);
      return;
    }

    let key = baseKey;
    let suffix = 1;
    while (await fastify.prisma.treeSpecies.findUnique({ where: { key } })) {
      suffix += 1;
      key = `${baseKey}_${suffix}`;
    }

    const maxSortOrder = await fastify.prisma.treeSpecies.aggregate({ _max: { sortOrder: true } });

    const species = await fastify.prisma.treeSpecies.create({
      data: {
        key,
        commonName,
        emoji: parsed.data.emoji,
        isActive: true,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
    });

    reply.status(201).send(species);
  });
}
