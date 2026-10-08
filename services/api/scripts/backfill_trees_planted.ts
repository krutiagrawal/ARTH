import { PrismaClient } from '@arth/db';
import { refreshUserCo2 } from '../src/services/treeImpact.service';

const prisma = new PrismaClient();

// Pending-review trees now count as planted (tree.service.ts), but trees planted earlier never
// bumped treesPlantedCount. Raises the counter to the number of non-rejected trees a user owns and
// refreshes their CO2. Never lowers a counter, so seeded demo users with no tree rows are untouched.
async function main() {
  const groups = await prisma.tree.groupBy({
    by: ['userId'],
    where: { isDeleted: false, aiVerificationStatus: { not: 'rejected' } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const user = await prisma.user.findUnique({ where: { id: g.userId }, select: { treesPlantedCount: true } });
    if (!user) continue;
    if (user.treesPlantedCount < g._count._all) {
      await prisma.user.update({ where: { id: g.userId }, data: { treesPlantedCount: g._count._all } });
    }
    const co2 = await refreshUserCo2(prisma, g.userId);
    console.log(`${g.userId}: trees ${user.treesPlantedCount} -> ${Math.max(user.treesPlantedCount, g._count._all)}, co2 ${co2}kg`);
  }
}

main().finally(() => prisma.$disconnect());
