// One-off, idempotent backfill: assigns a permanent, human-readable ARTH Tree Identity
// (`publicId`, e.g. "A48Z91") to every pre-existing `trees`/`planted_trees` row, now that both
// columns exist (added nullable by migration 20261005150000_tree_identity_and_observations).
// Must be run — and must succeed with zero remaining nulls — before migration
// 20261005150100_tree_identity_backfill_constraints adds the NOT NULL + unique constraints.
//
// Uses $queryRaw/$executeRaw rather than the typed client: schema.prisma declares `publicId` as
// the final non-nullable `String` (so TypeScript call sites get the right type everywhere else
// in the app), but the DB column is still transiently nullable at this exact point in the
// migration sequence — the typed client's generated filters reject `null` for a field it
// believes is required. Safe to re-run: only ever touches rows where public_id IS NULL.
//
// Run with: npx tsx prisma/scripts/backfillPublicIds.ts

import { PrismaClient } from '@prisma/client';
import { generatePublicId } from '../../publicId';

const prisma = new PrismaClient();

async function assignUniquePublicId(exists: (candidate: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generatePublicId();
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error('Could not generate a unique publicId after 10 attempts');
}

async function treePublicIdExists(candidate: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM trees WHERE public_id = ${candidate} LIMIT 1`;
  return rows.length > 0;
}

async function plantedTreePublicIdExists(candidate: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM planted_trees WHERE public_id = ${candidate} LIMIT 1`;
  return rows.length > 0;
}

async function backfillTrees() {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM trees WHERE public_id IS NULL`;
  let assigned = 0;
  for (const row of rows) {
    const publicId = await assignUniquePublicId(treePublicIdExists);
    await prisma.$executeRaw`UPDATE trees SET public_id = ${publicId} WHERE id = ${row.id}`;
    assigned += 1;
  }
  console.log(`trees: assigned ${assigned} publicId(s).`);
}

async function backfillPlantedTrees() {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM planted_trees WHERE public_id IS NULL`;
  let assigned = 0;
  for (const row of rows) {
    const publicId = await assignUniquePublicId(plantedTreePublicIdExists);
    await prisma.$executeRaw`UPDATE planted_trees SET public_id = ${publicId} WHERE id = ${row.id}`;
    assigned += 1;
  }
  console.log(`planted_trees: assigned ${assigned} publicId(s).`);
}

async function main() {
  await backfillTrees();
  await backfillPlantedTrees();

  const [treesRemaining] = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM trees WHERE public_id IS NULL`;
  const [plantedTreesRemaining] = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM planted_trees WHERE public_id IS NULL`;
  if (Number(treesRemaining.count) > 0 || Number(plantedTreesRemaining.count) > 0) {
    throw new Error(
      `Backfill incomplete: ${treesRemaining.count} trees and ${plantedTreesRemaining.count} planted_trees still missing a publicId.`,
    );
  }
  console.log('Backfill complete — zero rows remain without a publicId.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
