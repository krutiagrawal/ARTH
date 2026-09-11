// One-off, idempotent backfill: links every pre-existing SaplingStock row's free-text `species`
// string to a TreeSpecies catalog entry, now that SaplingStock.speciesId exists (decision 6 of
// the nursery module extension). Case-insensitive match against TreeSpecies.commonName first;
// on no match, creates a new TreeSpecies row (isCuratedBotanical: false, addedByRole: 'nursery')
// using the same slugify/find-or-create convention as services/api/src/routes/species.routes.ts,
// then links it. Safe to re-run: only ever touches rows where speciesId is still null.
//
// Run with: npx tsx prisma/scripts/backfillSaplingSpecies.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'species'
  );
}

async function findOrCreateSpecies(commonName: string) {
  const existing = await prisma.treeSpecies.findFirst({
    where: { commonName: { equals: commonName, mode: 'insensitive' } },
  });
  if (existing) return existing;

  const baseKey = slugify(commonName);
  let key = baseKey;
  let suffix = 1;
  while (await prisma.treeSpecies.findUnique({ where: { key } })) {
    suffix += 1;
    key = `${baseKey}_${suffix}`;
  }

  const maxSortOrder = await prisma.treeSpecies.aggregate({ _max: { sortOrder: true } });

  return prisma.treeSpecies.create({
    data: {
      key,
      commonName,
      emoji: '🌱',
      isActive: true,
      isCuratedBotanical: false,
      addedByRole: 'nursery',
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });
}

async function main() {
  const rows = await prisma.saplingStock.findMany({ where: { speciesId: null } });
  console.log(`Backfilling speciesId for ${rows.length} sapling_stock row(s) missing it...`);

  const cache = new Map<string, string>(); // lowercased species name -> TreeSpecies.id

  let created = 0;
  let linked = 0;
  for (const row of rows) {
    const name = row.species.trim();
    const cacheKey = name.toLowerCase();

    let speciesId = cache.get(cacheKey);
    if (!speciesId) {
      const before = await prisma.treeSpecies.count();
      const species = await findOrCreateSpecies(name);
      const after = await prisma.treeSpecies.count();
      if (after > before) created += 1;
      speciesId = species.id;
      cache.set(cacheKey, speciesId);
    }

    await prisma.saplingStock.update({ where: { id: row.id }, data: { speciesId } });
    linked += 1;
  }

  console.log(`Done. Linked ${linked} row(s), created ${created} new TreeSpecies row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
