import { PrismaClient } from '@plant/db';
import { recomputeReputation } from '../src/services/nurseryReputation.service';

const prisma = new PrismaClient();

async function main() {
  const nurseries = await prisma.nurseryProfile.findMany({ select: { id: true, nurseryName: true } });
  console.log(`Backfilling reputation for ${nurseries.length} nurseries...`);
  for (const n of nurseries) {
    const result = await prisma.$transaction((tx) => recomputeReputation(tx, n.id));
    console.log(`  ${n.nurseryName}: trustScore=${result.trustScore} growthLevel=${result.growthLevel}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
