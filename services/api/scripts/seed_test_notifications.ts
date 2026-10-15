import { PrismaClient } from '@arth/db';

const prisma = new PrismaClient();

// Inserts one notification of each type the UAT notification cases need, for one account, so the
// tap-routing and pagination cases can be tested by hand. Every row carries data.uatSeed so
// `--cleanup` removes exactly these and nothing else.
//
//   npx tsx scripts/seed_test_notifications.ts [email] [--cleanup]
//
// With no email it looks for an account whose email/handle/name contains "krutii", then falls back
// to krutiagrawal85@gmail.com.

const TAG = 'uat-notifications';
const FILLER_COUNT = 60; // page size is 25, so this gives 3 pages
const args = process.argv.slice(2);
const cleanup = args.includes('--cleanup');
const emailArg = args.find((a) => !a.startsWith('--'));

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}

async function findTarget() {
  if (emailArg) return prisma.user.findUnique({ where: { email: emailArg } });
  const byKrutii = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: 'krutii', mode: 'insensitive' } },
        { handle: { contains: 'krutii', mode: 'insensitive' } },
        { name: { contains: 'krutii', mode: 'insensitive' } },
      ],
    },
  });
  return byKrutii ?? prisma.user.findUnique({ where: { email: 'krutiagrawal85@gmail.com' } });
}

async function main() {
  const me = await findTarget();
  if (!me) throw new Error('Target account not found. Pass the email as the first argument.');
  console.log(`Target: ${me.name} <${me.email}> (@${me.handle})`);

  if (cleanup) {
    const { count } = await prisma.notification.deleteMany({
      where: { userId: me.id, data: { path: ['uatSeed'], equals: TAG } },
    });
    console.log(`Removed ${count} seeded notifications.`);
    return;
  }

  const already = await prisma.notification.count({
    where: { userId: me.id, data: { path: ['uatSeed'], equals: TAG } },
  });
  if (already > 0) {
    console.log(`Already seeded (${already} rows). Run with --cleanup first to reseed.`);
    return;
  }

  const [actor, secondActor] = await prisma.user.findMany({
    where: { id: { not: me.id }, role: 'user', isDeleted: false },
    take: 2,
  });
  if (!actor) throw new Error('Need at least one other individual user to act as the liker/requester.');
  const nursery = await prisma.nurseryProfile.findFirst({ orderBy: { createdAt: 'asc' } });
  const post =
    (await prisma.post.findFirst({ where: { userId: me.id, isHidden: false } })) ??
    (await prisma.post.findFirst({ where: { isHidden: false } }));

  const base = { userId: me.id, readAt: null };
  const data = { uatSeed: TAG };
  const rows: any[] = [];
  let t = 1; // each row a minute apart so the order on screen is predictable

  if (post) rows.push({ ...base, type: 'post_like', actorUserId: actor.id, postId: post.id, data, createdAt: minutesAgo(t++) });
  else console.warn('No posts in the DB — skipping post_like.');

  rows.push({ ...base, type: 'follow_request', actorUserId: (secondActor ?? actor).id, data, createdAt: minutesAgo(t++) });

  if (nursery) {
    rows.push({ ...base, type: 'reservation_fulfilled', actorNurseryId: nursery.id, data, createdAt: minutesAgo(t++) });
    rows.push({ ...base, type: 'reservation_declined', actorNurseryId: nursery.id, data, createdAt: minutesAgo(t++) });
    rows.push({ ...base, type: 'wishlist_back_in_stock', actorNurseryId: nursery.id, data, createdAt: minutesAgo(t++) });
  } else {
    console.warn('No nursery in the DB — skipping reservation_* and wishlist_back_in_stock.');
  }

  // No orderId in the payload, so the tap should fall back to My Orders rather than crash.
  rows.push({ ...base, type: 'order_confirmed', actorNurseryId: nursery?.id ?? null, data, createdAt: minutesAgo(t++) });
  rows.push({ ...base, type: 'cart_abandoned', data, createdAt: minutesAgo(t++) });
  rows.push({ ...base, type: 'streak_at_risk', data, createdAt: minutesAgo(t++) });
  rows.push({ ...base, type: 'streak_broken', data, createdAt: minutesAgo(t++) });

  // Older filler (a day+ back) so pagination has more than one page behind the cases above.
  for (let i = 0; i < FILLER_COUNT; i++) {
    rows.push({
      ...base,
      type: 'reengagement_nudge',
      data,
      createdAt: new Date(Date.now() - (24 * 60 + i * 30) * 60 * 1000),
    });
  }

  await prisma.notification.createMany({ data: rows });
  console.log(`Created ${rows.length} notifications (${rows.length - FILLER_COUNT} typed + ${FILLER_COUNT} filler).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
