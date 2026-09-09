import { PrismaClient } from '@plant/db';

const prisma = new PrismaClient();

// seed_my_account_demo.ts only unlocked achievements for the real logged-in account — every
// other demo user has zero UserAchievement rows, so their Achievements tab is legitimately empty
// no matter which @arth.demo account you're testing with. This tops all of them up too.
// Safe to rerun: upsert on the [userId, achievementId] unique key.

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  const achievements = await prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } });
  const users = await prisma.user.findMany({ where: { role: 'user' }, select: { id: true } });
  if (achievements.length === 0 || users.length === 0) {
    console.log('Nothing to do — no achievements or users found.');
    return;
  }

  let unlockedTotal = 0;
  let inProgressTotal = 0;
  for (const u of users) {
    const already = await prisma.userAchievement.count({ where: { userId: u.id } });
    if (already > 0) continue; // already has coverage (e.g. the real seeded account)

    const unlockCount = randInt(1, Math.min(6, achievements.length));
    for (let i = 0; i < achievements.length; i++) {
      const a = achievements[i];
      const unlocked = i < unlockCount;
      const target = a.criteriaTarget ?? 1;
      await prisma.userAchievement.create({
        data: {
          userId: u.id,
          achievementId: a.id,
          unlocked,
          progress: unlocked ? target : Math.max(0, Math.round(target * (0.2 + Math.random() * 0.5))),
          unlockedAt: unlocked ? daysAgo(randInt(1, 120)) : null,
        },
      });
      unlocked ? unlockedTotal++ : inProgressTotal++;
    }
  }
  console.log(`Backfilled achievements for demo users: ${unlockedTotal} unlocked rows, ${inProgressTotal} in-progress rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
