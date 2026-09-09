import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Complements seed_admin_demo.ts + seed_social_demo.ts: those two build out the demo *world*
// (other accounts, their posts/stories/follows). This script is the third pass — it (a) creates/
// tops up the real, currently-logged-in account so "my profile" has posts/stories/friends/
// achievements/orders/notifications to browse, (b) adds a few more NGOs/nurseries for directory
// depth, and (c) fills the one thing neither prior script touched at all: notifications.
//
// Safe to rerun: the account is looked up by email first; every relation is looked up or uses
// skipDuplicates before creating. Notifications have no natural unique key, so a rerun is guarded
// behind a marker check the same way seed_social_demo.ts guards its posts/stories block.

const MY_EMAIL = 'krutiagrawal85@gmail.com';
const MY_PASSWORD = 'DemoPass123!'; // same convention as seed_admin_demo.ts / seed_social_demo.ts
const DEMO_PASSWORD = 'DemoPass123!';

function img(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursFromNow(n: number) {
  return new Date(Date.now() + n * 60 * 60 * 1000);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function findOrCreateUser(opts: {
  email: string;
  name: string;
  handle: string;
  role?: 'user' | 'ngo' | 'nursery';
  bio?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) return existing;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role: opts.role ?? 'user',
        email: opts.email,
        passwordHash,
        passwordPlain: DEMO_PASSWORD,
        name: opts.name,
        handle: opts.handle,
        bio: opts.bio,
      },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
    return created;
  });
}

async function main() {
  console.log('Seeding "my account" + notifications + extra directory depth...');

  // ============================================================ My account
  let me = await prisma.user.findUnique({ where: { email: MY_EMAIL } });
  if (!me) {
    const passwordHash = await hashPassword(MY_PASSWORD);
    me = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: 'user',
          email: MY_EMAIL,
          passwordHash,
          passwordPlain: MY_PASSWORD,
          name: 'Kruti Agrawal',
          handle: 'kruti_agrawal',
          bio: 'Planting my way through 2026 🌱 | Pune',
          avatarEmoji: '🧑‍🌾',
          treesPlantedCount: 28,
          totalCo2Absorbed: 142.5,
          streakCurrent: 9,
          streakMax: 21,
          badgesCount: 5,
          xp: 1450,
          level: 4,
        },
      });
      await tx.userSettings.create({ data: { userId: created.id } });
      return created;
    });
    console.log(`Created my account: ${me.email} / password: ${MY_PASSWORD}`);
  } else {
    console.log(`My account already exists: ${me.email}`);
  }
  const myId = me.id;

  // ============================================================ A few more NGOs + nurseries
  const EXTRA_NGO_SEED = [
    { key: 'wildwood-trust', orgName: 'Wildwood Trust', city: 'Bengaluru' },
    { key: 'coastal-greens-ngo', orgName: 'Coastal Greens', city: 'Chennai' },
    { key: 'sahyadri-forest-alliance', orgName: 'Sahyadri Forest Alliance', city: 'Nashik' },
  ];
  const extraNgos: { profile: any; user: any }[] = [];
  for (const n of EXTRA_NGO_SEED) {
    const user = await findOrCreateUser({ email: `${n.key}@arth.demo`, name: `${n.orgName} Admin`, handle: `${n.key.replace(/-/g, '_')}_admin`, role: 'ngo' });
    let profile = await prisma.ngoProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.ngoProfile.create({
        data: {
          userId: user.id,
          orgName: n.orgName,
          description: `DEMO NGO — ${n.orgName} runs community tree-planting drives around ${n.city}.`,
          website: `https://${n.key}.example.org`,
          contactPhone: '9876500003',
          logoUrl: img(n.key),
          city: n.city,
          foundedYear: 2018,
          volunteerCountEstimate: 60,
          status: 'approved',
          approvedAt: daysAgo(120),
        },
      });
      for (let i = 1; i <= 2; i++) {
        await prisma.post.create({
          data: {
            authorType: 'ngo',
            ngoId: profile.id,
            caption: `DEMO Update ${i} — ${n.orgName}`,
            createdAt: daysAgo(randInt(1, 30)),
            media: { create: [{ url: img(`${n.key}-update-${i}`, 800, 600), order: 0 }] },
          },
        });
      }
      await prisma.story.create({
        data: { authorType: 'ngo', ngoId: profile.id, imageUrl: img(`${n.key}-story`, 700, 1200), createdAt: hoursFromNow(-2), expiresAt: hoursFromNow(20) },
      });
    }
    extraNgos.push({ profile, user });
  }
  console.log(`Extra NGOs: ${extraNgos.length}`);

  const EXTRA_NURSERY_SEED = [
    { key: 'leafy-lane-nursery', nurseryName: 'Leafy Lane Nursery', city: 'Bengaluru' },
    { key: 'terracotta-saplings', nurseryName: 'Terracotta Saplings', city: 'Hyderabad' },
  ];
  const extraNurseries: { profile: any; user: any }[] = [];
  for (const n of EXTRA_NURSERY_SEED) {
    const user = await findOrCreateUser({ email: `${n.key}@arth.demo`, name: `${n.nurseryName} Admin`, handle: `${n.key.replace(/-/g, '_')}_admin`, role: 'nursery' });
    let profile = await prisma.nurseryProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.nurseryProfile.create({
        data: {
          userId: user.id,
          nurseryName: n.nurseryName,
          description: `DEMO nursery — ${n.nurseryName} grows saplings for delivery around ${n.city}.`,
          logoUrl: img(n.key),
          coverPhotoUrl: img(`${n.key}-cover`, 1200, 500),
          city: n.city,
          contactPhone: '9876500004',
          status: 'approved',
          approvedAt: daysAgo(90),
          avgRating: 4.6,
          reviewCount: 9,
        },
      });
      await prisma.saplingStock.createMany({
        data: [
          { nurseryId: profile.id, species: 'Neem', quantity: 25, isFree: true, priceCents: null, photoUrl: img('stock-neem-2') },
          { nurseryId: profile.id, species: 'Gulmohar', quantity: 5, isFree: false, priceCents: 19900, photoUrl: img('stock-gulmohar') },
        ],
      });
      await prisma.post.create({
        data: {
          authorType: 'nursery',
          nurseryId: profile.id,
          caption: `DEMO Fresh batch of ${n.nurseryName} saplings ready`,
          createdAt: daysAgo(3),
          media: { create: [{ url: img(`${n.key}-fresh`, 800, 600), order: 0 }] },
        },
      });
    }
    extraNurseries.push({ profile, user });
  }
  console.log(`Extra nurseries: ${extraNurseries.length}`);

  // ============================================================ Cast of existing demo users
  const otherUsers = await prisma.user.findMany({ where: { role: 'user', email: { not: MY_EMAIL } }, take: 40 });
  if (otherUsers.length === 0) {
    console.log('No other demo users found — run seed_admin_demo.ts and seed_social_demo.ts first for a full world. Continuing with just my account.');
  }
  const allNgos = await prisma.ngoProfile.findMany({ where: { status: 'approved' } });
  const allNurseries = await prisma.nurseryProfile.findMany({ where: { status: 'approved' } });
  const drives = await prisma.drive.findMany({ take: 10 });
  const group = await prisma.groupProfile.findFirst({ where: { status: 'active' } });

  // ============================================================ Friendships
  const friendCandidates = sample(otherUsers, Math.min(6, otherUsers.length));
  if (friendCandidates.length > 0) {
    await prisma.friendship.createMany({
      data: friendCandidates.map((u) => ({ requesterId: myId, addresseeId: u.id, status: 'accepted' as const, respondedAt: daysAgo(randInt(1, 60)) })),
      skipDuplicates: true,
    });
  }
  const pendingIncoming = sample(
    otherUsers.filter((u) => !friendCandidates.some((f) => f.id === u.id)),
    Math.min(3, otherUsers.length),
  );
  for (const u of pendingIncoming) {
    await prisma.friendship.create({ data: { requesterId: u.id, addresseeId: myId, status: 'pending' } }).catch(() => undefined);
  }
  const pendingOutgoingTarget = otherUsers.find((u) => !friendCandidates.some((f) => f.id === u.id) && !pendingIncoming.some((p) => p.id === u.id));
  if (pendingOutgoingTarget) {
    await prisma.friendship.create({ data: { requesterId: myId, addresseeId: pendingOutgoingTarget.id, status: 'pending' } }).catch(() => undefined);
  }
  console.log(`Friendships: ${friendCandidates.length} accepted, ${pendingIncoming.length} pending incoming, ${pendingOutgoingTarget ? 1 : 0} pending outgoing`);

  // ============================================================ Follows
  const followedNgos = sample(allNgos, Math.min(3, allNgos.length));
  const followedNurseries = sample(allNurseries, Math.min(2, allNurseries.length));
  await prisma.follow.createMany({
    data: [
      ...followedNgos.map((n) => ({ followerId: myId, ngoId: n.id, status: 'accepted' as const })),
      ...followedNurseries.map((n) => ({ followerId: myId, nurseryId: n.id, status: 'accepted' as const })),
    ],
    skipDuplicates: true,
  });
  console.log(`Follows: ${followedNgos.length} NGOs, ${followedNurseries.length} nurseries`);

  // ============================================================ Group membership
  if (group) {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: myId, role: 'member' } }).catch(() => undefined);
    console.log(`Joined group: ${group.groupName}`);
  }

  // ============================================================ Drive RSVPs
  const myDrives = sample(drives, Math.min(2, drives.length));
  if (myDrives.length > 0) {
    await prisma.driveRsvp.createMany({
      data: myDrives.map((d) => ({ driveId: d.id, userId: myId, status: 'confirmed' as const })),
      skipDuplicates: true,
    });
  }
  console.log(`Drive RSVPs: ${myDrives.length}`);

  // ============================================================ Achievements
  const achievements = await prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } });
  const half = Math.ceil(achievements.length / 2);
  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i];
    const unlocked = i < half;
    const target = a.criteriaTarget ?? 1;
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: myId, achievementId: a.id } },
      update: {},
      create: {
        userId: myId,
        achievementId: a.id,
        unlocked,
        progress: unlocked ? target : Math.max(0, Math.round(target * (0.3 + Math.random() * 0.4))),
        unlockedAt: unlocked ? daysAgo(randInt(1, 90)) : null,
      },
    });
  }
  console.log(`Achievements: ${half} unlocked, ${achievements.length - half} in progress`);

  // ============================================================ My posts + likers (captured for notifications)
  const MY_CAPTIONS = [
    'DEMO Mine — Morning planting session, three saplings down 🌱',
    'DEMO Mine — Six weeks in and this one is thriving 🌳',
    'DEMO Mine — Joined a riverside drive today, incredible turnout.',
    'DEMO Mine — Balcony forest update: new arrivals!',
    'DEMO Mine — Watering duty complete, feeling accomplished 💧',
  ];
  const myPosts: any[] = [];
  const myPostLikers: { postId: string; likerId: string }[] = [];
  const alreadyMine = await prisma.post.count({ where: { userId: myId, caption: { startsWith: 'DEMO Mine' } } });
  if (alreadyMine === 0) {
    for (let i = 0; i < MY_CAPTIONS.length; i++) {
      const mediaCount = randInt(1, 3);
      const post = await prisma.post.create({
        data: {
          authorType: 'user',
          userId: myId,
          caption: MY_CAPTIONS[i],
          createdAt: daysAgo(randInt(0, 30)),
          media: { create: Array.from({ length: mediaCount }, (_, order) => ({ url: img(`kruti-post-${i}-${order}`), order })) },
        },
      });
      myPosts.push(post);
      const likers = sample(otherUsers, randInt(2, Math.min(6, otherUsers.length)));
      if (likers.length > 0) {
        await prisma.postLike.createMany({ data: likers.map((l) => ({ postId: post.id, userId: l.id })), skipDuplicates: true });
        await prisma.post.update({ where: { id: post.id }, data: { likeCount: likers.length } });
        for (const l of likers) myPostLikers.push({ postId: post.id, likerId: l.id });
      }
    }
    console.log(`My posts: ${myPosts.length}`);
  } else {
    console.log('My posts already seeded — skipping.');
  }

  // ============================================================ My stories
  const alreadyMyStories = await prisma.story.count({ where: { userId: myId } });
  if (alreadyMyStories === 0) {
    for (let i = 0; i < 3; i++) {
      const story = await prisma.story.create({
        data: {
          authorType: 'user',
          userId: myId,
          imageUrl: img(`kruti-story-${i}`, 700, 1200),
          caption: i === 0 ? 'Out planting today 🌱' : undefined,
          createdAt: hoursFromNow(-randInt(0, 6)),
          expiresAt: hoursFromNow(randInt(4, 22)),
        },
      });
      const viewers = sample(otherUsers, randInt(2, Math.min(8, otherUsers.length)));
      if (viewers.length > 0) {
        await prisma.storyView.createMany({ data: viewers.map((v) => ({ storyId: story.id, userId: v.id })), skipDuplicates: true });
        const likers = sample(viewers, randInt(0, viewers.length));
        if (likers.length > 0) {
          await prisma.storyLike.createMany({ data: likers.map((l) => ({ storyId: story.id, userId: l.id })), skipDuplicates: true });
          await prisma.story.update({ where: { id: story.id }, data: { likeCount: likers.length } });
        }
      }
    }
    console.log('My stories: 3');
  } else {
    console.log('My stories already seeded — skipping.');
  }

  // ============================================================ Sapling reservations, order, wishlist
  let reservationFulfilled: any = null;
  let reservationDeclined: any = null;
  let orderConfirmed: any = null;
  let orderDelivered: any = null;
  let wishlistNursery: any = null;

  const reservationNursery = allNurseries[0];
  if (reservationNursery) {
    const stock = await prisma.saplingStock.findMany({ where: { nurseryId: reservationNursery.id }, take: 2 });
    if (stock[0]) {
      reservationFulfilled = await prisma.saplingReservation.findFirst({ where: { userId: myId, stockId: stock[0].id, status: 'fulfilled' } });
      if (!reservationFulfilled) {
        reservationFulfilled = await prisma.saplingReservation.create({
          data: { stockId: stock[0].id, nurseryId: reservationNursery.id, userId: myId, quantity: 2, status: 'fulfilled', message: 'DEMO — for the balcony', respondedAt: daysAgo(3) },
        });
      }
    }
    if (stock[1]) {
      reservationDeclined = await prisma.saplingReservation.findFirst({ where: { userId: myId, stockId: stock[1].id, status: 'declined' } });
      if (!reservationDeclined) {
        reservationDeclined = await prisma.saplingReservation.create({
          data: { stockId: stock[1].id, nurseryId: reservationNursery.id, userId: myId, quantity: 1, status: 'declined', message: 'DEMO — out of stock at pickup', respondedAt: daysAgo(1) },
        });
      }
    }

    let myAddress = await prisma.address.findFirst({ where: { userId: myId, label: 'DEMO Home' } });
    if (!myAddress) {
      myAddress = await prisma.address.create({ data: { userId: myId, label: 'DEMO Home', line1: '4 Fern Court', city: 'Pune', pincode: '411004', isDefault: true } });
    }
    const paidStock = stock.find((s) => s.priceCents) ?? stock[0];
    if (paidStock) {
      const confirmedStripeId = `pi_demo_myorder_confirmed_${myId.slice(0, 8)}`;
      orderConfirmed = await prisma.order.findFirst({ where: { stripePaymentIntentId: confirmedStripeId } });
      if (!orderConfirmed) {
        orderConfirmed = await prisma.order.create({
          data: {
            userId: myId,
            nurseryId: reservationNursery.id,
            addressId: myAddress.id,
            status: 'confirmed',
            subtotalCents: paidStock.priceCents ?? 0,
            deliveryFeeCents: 4900,
            totalCents: (paidStock.priceCents ?? 0) + 4900,
            stripePaymentIntentId: confirmedStripeId,
            confirmedAt: daysAgo(2),
            items: { create: [{ stockId: paidStock.id, species: paidStock.species, quantity: 1, unitPriceCents: paidStock.priceCents ?? 0 }] },
          },
        });
      }
      const deliveredStripeId = `pi_demo_myorder_delivered_${myId.slice(0, 8)}`;
      orderDelivered = await prisma.order.findFirst({ where: { stripePaymentIntentId: deliveredStripeId } });
      if (!orderDelivered) {
        orderDelivered = await prisma.order.create({
          data: {
            userId: myId,
            nurseryId: reservationNursery.id,
            addressId: myAddress.id,
            status: 'delivered',
            subtotalCents: paidStock.priceCents ?? 0,
            deliveryFeeCents: 4900,
            totalCents: (paidStock.priceCents ?? 0) + 4900,
            stripePaymentIntentId: deliveredStripeId,
            confirmedAt: daysAgo(10),
            deliveredAt: daysAgo(7),
            items: { create: [{ stockId: paidStock.id, species: paidStock.species, quantity: 1, unitPriceCents: paidStock.priceCents ?? 0 }] },
          },
        });
      }
    }
    if (stock[0]) {
      const existingWishlist = await prisma.wishlistItem.findFirst({ where: { userId: myId, stockId: stock[0].id } });
      wishlistNursery = reservationNursery;
      if (!existingWishlist) {
        await prisma.wishlistItem.create({ data: { userId: myId, nurseryId: reservationNursery.id, stockId: stock[0].id } });
      }
    }
    console.log('Reservations, order, wishlist seeded for my account');
  }

  // ============================================================ My content report (-> report_resolved)
  const reportablePost = await prisma.post.findFirst({ where: { authorType: 'ngo' } });
  if (reportablePost) {
    await prisma.contentReport
      .create({
        data: {
          reporterId: myId,
          targetType: 'post',
          targetId: reportablePost.id,
          reason: 'spam',
          status: 'dismissed',
          details: 'DEMO — looked like spam at first glance.',
          reviewedAt: daysAgo(2),
        },
      })
      .catch(() => undefined);
  }

  // ============================================================ Notifications
  const alreadyNotified = await prisma.notification.count({ where: { userId: myId } });
  if (alreadyNotified > 0) {
    console.log(`Notifications already seeded for my account (${alreadyNotified} found) — skipping.`);
  } else {
    const rows: any[] = [];

    for (const { postId, likerId } of sample(myPostLikers, Math.min(3, myPostLikers.length))) {
      rows.push({ userId: myId, type: 'post_like', actorUserId: likerId, postId, createdAt: daysAgo(randInt(0, 5)), readAt: Math.random() < 0.5 ? daysAgo(randInt(0, 4)) : null });
    }
    for (const ngo of followedNgos.slice(0, 2)) {
      const post = await prisma.post.findFirst({ where: { ngoId: ngo.id }, orderBy: { createdAt: 'desc' } });
      if (post) rows.push({ userId: myId, type: 'new_post_from_followed', actorNgoId: ngo.id, postId: post.id, createdAt: daysAgo(randInt(0, 6)), readAt: daysAgo(randInt(1, 6)) });
    }
    if (myDrives[0]) {
      rows.push({ userId: myId, type: 'drive_reminder', actorNgoId: myDrives[0].ngoId, createdAt: daysAgo(1), readAt: null });
    }
    if (reservationFulfilled) {
      rows.push({ userId: myId, type: 'reservation_fulfilled', actorNurseryId: reservationNursery.id, createdAt: daysAgo(3), readAt: daysAgo(2) });
    }
    if (reservationDeclined) {
      rows.push({ userId: myId, type: 'reservation_declined', actorNurseryId: reservationNursery.id, createdAt: daysAgo(1), readAt: null });
    }
    if (orderConfirmed) {
      rows.push({ userId: myId, type: 'order_confirmed', actorNurseryId: reservationNursery.id, createdAt: daysAgo(2), readAt: daysAgo(1) });
    }
    if (orderDelivered) {
      rows.push({ userId: myId, type: 'order_delivered', actorNurseryId: reservationNursery.id, createdAt: daysAgo(7), readAt: daysAgo(6) });
    }
    if (wishlistNursery) {
      rows.push({ userId: myId, type: 'wishlist_back_in_stock', actorNurseryId: wishlistNursery.id, createdAt: daysAgo(0), readAt: null });
    }
    rows.push({ userId: myId, type: 'report_resolved', createdAt: daysAgo(1), readAt: null });

    if (rows.length > 0) {
      await prisma.notification.createMany({ data: rows });
    }
    console.log(`Notifications for my account: ${rows.length}`);
  }

  // A little breadth on the flagship NGO account too, so follow_request/accepted/new_follower —
  // the three types no individual user ever naturally receives — are visible somewhere.
  const flagshipNgoUser = allNgos[0] ? await prisma.user.findUnique({ where: { id: allNgos[0].userId } }) : null;
  if (flagshipNgoUser) {
    const already = await prisma.notification.count({ where: { userId: flagshipNgoUser.id, type: { in: ['follow_request', 'follow_accepted', 'new_follower'] } } });
    if (already === 0 && otherUsers.length >= 3) {
      const [a, b, c] = sample(otherUsers, 3);
      await prisma.notification.createMany({
        data: [
          { userId: flagshipNgoUser.id, type: 'follow_request', actorUserId: a.id, createdAt: daysAgo(1), readAt: null },
          { userId: flagshipNgoUser.id, type: 'follow_accepted', actorUserId: b.id, createdAt: daysAgo(2), readAt: daysAgo(1) },
          { userId: flagshipNgoUser.id, type: 'new_follower', actorUserId: c.id, createdAt: daysAgo(3), readAt: daysAgo(1) },
        ],
      });
      console.log(`Notifications for flagship NGO account (${flagshipNgoUser.email}): 3`);
    }
  }

  console.log('\nDone.');
  console.log(`Log in as me: ${MY_EMAIL} / ${MY_PASSWORD}`);
  console.log('All other demo accounts share password:', DEMO_PASSWORD, '(emails end in @arth.demo).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
