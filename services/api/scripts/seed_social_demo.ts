import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Complements seed_admin_demo.ts: that script seeds account fixtures across every approval
// status; this one seeds the *social graph* on top of them — posts, likes, stories (with the new
// StoryLike/viewer data), friendships, and follows — so the Instagram-style profiles and story
// tray have real content to scroll through instead of empty states.
//
// Safe to rerun: users/follows/friendships/memberships/likes/views all dedupe via unique
// constraints (skipDuplicates) or lookups. Post/story creation itself is skipped on a rerun once
// it detects it already ran (checked via a marker caption), since posts have no natural unique key.

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
  bio?: string;
  avatarEmoji?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) return existing;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role: 'user',
        email: opts.email,
        passwordHash,
        passwordPlain: DEMO_PASSWORD,
        name: opts.name,
        handle: opts.handle,
        bio: opts.bio,
        avatarEmoji: opts.avatarEmoji ?? '🌱',
        treesPlantedCount: randInt(2, 45),
        totalCo2Absorbed: randInt(5, 200),
        streakCurrent: randInt(0, 21),
        streakMax: randInt(5, 40),
        badgesCount: randInt(0, 6),
        xp: randInt(50, 3000),
        level: randInt(1, 6),
      },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
    return created;
  });
}

const BIOS = [
  'Planting one tree at a time 🌱 | Weekend hiker | Pune',
  'Urban gardener turned tree-planting addict 🌳',
  'Here for the trees and the community 🌿',
  'Believer in small daily climate wins.',
  'Grew up next to a forest, trying to give back.',
  'Tree nerd. Ask me about native species.',
  "Started with one sapling in 2023, haven't stopped.",
  'Weekend drives, weekday water-carrying duty 💧',
  'Making my balcony a jungle, one pot at a time.',
  'Runner, reader, occasional tree planter.',
  'Trying to offset my flights, tree by tree.',
  'Here with my kids — teaching them to plant young.',
];

const POST_CAPTIONS = [
  'DEMO Social — Morning planting session, feeling great about this one 🌱',
  'DEMO Social — Finally got around to watering the saplings from last month!',
  "DEMO Social — This little guy is growing faster than I expected 🌳",
  'DEMO Social — Joined a drive today with some amazing people.',
  'DEMO Social — Native species > ornamental, change my mind.',
  'DEMO Social — Six months later and look at the growth!',
  'DEMO Social — Rainy season is the best time to plant, no cap.',
  'DEMO Social — Group planting day was such a vibe today.',
  'DEMO Social — Adopted a new tree this week, meet the newest member of the family.',
  'DEMO Social — Small balcony, big ambitions 🌿',
  'DEMO Social — Progress pic from the riverside patch.',
  'DEMO Social — Nothing beats mud on your hands after a good planting session.',
];

const STORY_CAPTIONS = [
  'Out planting today 🌱',
  'Fresh batch just went in the ground',
  'Golden hour at the drive site',
  null,
  null,
  'Watering duty ☀️',
];

async function main() {
  console.log('Seeding social demo data (posts, likes, stories, follows, friendships)...');

  // ---------- Users ----------
  const NEW_USER_SEED = [
    { email: 'ananya.desai@arth.demo', name: 'Ananya Desai', handle: 'ananya_desai' },
    { email: 'vikram.joshi@arth.demo', name: 'Vikram Joshi', handle: 'vikram_joshi' },
    { email: 'priya.menon@arth.demo', name: 'Priya Menon', handle: 'priya_menon' },
    { email: 'arjun.kapoor@arth.demo', name: 'Arjun Kapoor', handle: 'arjun_kapoor' },
    { email: 'sanya.bhatt@arth.demo', name: 'Sanya Bhatt', handle: 'sanya_bhatt' },
    { email: 'dev.malhotra@arth.demo', name: 'Dev Malhotra', handle: 'dev_malhotra' },
    { email: 'neha.pillai@arth.demo', name: 'Neha Pillai', handle: 'neha_pillai' },
    { email: 'rahul.verma@arth.demo', name: 'Rahul Verma', handle: 'rahul_verma' },
    { email: 'tara.shah@arth.demo', name: 'Tara Shah', handle: 'tara_shah' },
    { email: 'yash.chawla@arth.demo', name: 'Yash Chawla', handle: 'yash_chawla' },
    { email: 'zara.khan@arth.demo', name: 'Zara Khan', handle: 'zara_khan' },
    { email: 'omkar.deshmukh@arth.demo', name: 'Omkar Deshmukh', handle: 'omkar_deshmukh' },
  ];
  const AVATAR_EMOJIS = ['🧑‍🌾', '🌱', '🌳', '🌲', '🍃', '🌿', '🌸', '🌻', '🦋', '🐝', '🌍', '💚'];

  const newUsers = [];
  for (let i = 0; i < NEW_USER_SEED.length; i++) {
    const u = NEW_USER_SEED[i];
    newUsers.push(await findOrCreateUser({ ...u, bio: BIOS[i % BIOS.length], avatarEmoji: AVATAR_EMOJIS[i % AVATAR_EMOJIS.length] }));
  }

  // Blend in seed_admin_demo.ts's individual users too, if that script has already run —
  // backfilling a bio for any that don't have one yet.
  const ADMIN_DEMO_EMAILS = [
    'aarav.mehta@arth.demo',
    'diya.kulkarni@arth.demo',
    'rohan.iyer@arth.demo',
    'ishita.rao@arth.demo',
    'kabir.singh@arth.demo',
    'meera.nair@arth.demo',
  ];
  const adminDemoUsers = await prisma.user.findMany({ where: { email: { in: ADMIN_DEMO_EMAILS } } });
  for (let i = 0; i < adminDemoUsers.length; i++) {
    const u = adminDemoUsers[i];
    if (!u.bio) await prisma.user.update({ where: { id: u.id }, data: { bio: BIOS[i % BIOS.length] } });
  }

  const users = [...newUsers, ...adminDemoUsers];
  console.log(`Users in social graph: ${users.length}`);

  // ---------- NGOs / Nurseries / Group (reuse seed_admin_demo.ts's if present, else create a
  // small fallback set so this script also works standalone) ----------
  let ngos = await prisma.ngoProfile.findMany({ where: { status: 'approved' } });
  if (ngos.length === 0) {
    const ngoUser = await findOrCreateUser({ email: 'fallback-ngo@arth.demo', name: 'Fallback NGO Admin', handle: 'fallback_ngo_admin' });
    const ngo = await prisma.ngoProfile.create({
      data: {
        userId: ngoUser.id,
        orgName: 'Canopy Collective',
        description: 'DEMO NGO seeded standalone by seed_social_demo.ts.',
        logoUrl: img('fallback-ngo'),
        city: 'Pune',
        status: 'approved',
        approvedAt: daysAgo(200),
      },
    });
    ngos = [ngo];
  }

  let nurseries = await prisma.nurseryProfile.findMany({ where: { status: 'approved' } });
  if (nurseries.length === 0) {
    const nurseryUser = await findOrCreateUser({ email: 'fallback-nursery@arth.demo', name: 'Fallback Nursery Admin', handle: 'fallback_nursery_admin' });
    const nursery = await prisma.nurseryProfile.create({
      data: {
        userId: nurseryUser.id,
        nurseryName: 'Sunroot Nursery',
        description: 'DEMO nursery seeded standalone by seed_social_demo.ts.',
        logoUrl: img('fallback-nursery'),
        city: 'Pune',
        status: 'approved',
        approvedAt: daysAgo(150),
      },
    });
    nurseries = [nursery];
  }

  let groups = await prisma.groupProfile.findMany({ where: { status: 'active' } });
  if (groups.length === 0) {
    const groupOwner = await findOrCreateUser({ email: 'fallback-group@arth.demo', name: 'Fallback Group Owner', handle: 'fallback_group_owner' });
    const group = await prisma.groupProfile.create({
      data: {
        userId: groupOwner.id,
        groupName: 'Green Families Pune',
        groupType: 'family',
        description: 'DEMO group seeded standalone by seed_social_demo.ts.',
        logoUrl: img('fallback-group'),
        city: 'Pune',
        inviteCode: 'DEMOFAM2',
        status: 'active',
      },
    });
    groups = [group];
  }
  const group = groups[0];
  console.log(`NGOs: ${ngos.length}, Nurseries: ${nurseries.length}, Groups: ${groups.length}`);

  const drives = await prisma.drive.findMany({ take: 10 });

  // ---------- Friendships (accepted web + a few pending) ----------
  const friendshipPairs = new Map<string, { requesterId: string; addresseeId: string }>();
  for (const u of users) {
    const others = users.filter((o) => o.id !== u.id);
    for (const friend of sample(others, randInt(3, 6))) {
      const [a, b] = [u.id, friend.id].sort();
      friendshipPairs.set(`${a}:${b}`, { requesterId: a, addresseeId: b });
    }
  }
  const friendshipRows = [...friendshipPairs.values()];
  if (friendshipRows.length > 0) {
    await prisma.friendship.createMany({
      data: friendshipRows.map((f) => ({ ...f, status: 'accepted' as const, respondedAt: daysAgo(randInt(1, 60)) })),
      skipDuplicates: true,
    });
  }
  // A few pending requests, so the friend-requests inbox has something to show too.
  const pendingCandidates = sample(users, Math.min(4, users.length));
  for (let i = 0; i < pendingCandidates.length - 1; i++) {
    await prisma.friendship
      .create({ data: { requesterId: pendingCandidates[i].id, addresseeId: pendingCandidates[i + 1].id, status: 'pending' } })
      .catch(() => undefined); // already exists (accepted or pending) — fine, skip
  }
  console.log(`Friendships: ~${friendshipRows.length} accepted pairs seeded`);

  // ---------- Follows (users -> NGOs/nurseries) ----------
  const followTargets = [...ngos.map((n) => ({ ngoId: n.id })), ...nurseries.map((n) => ({ nurseryId: n.id }))];
  const followRows = [];
  for (const u of users) {
    for (const target of sample(followTargets, randInt(2, followTargets.length))) {
      followRows.push({ followerId: u.id, status: 'accepted' as const, ...target });
    }
  }
  if (followRows.length > 0) {
    await prisma.follow.createMany({ data: followRows, skipDuplicates: true });
  }
  console.log(`Follows: ~${followRows.length} rows seeded`);

  // ---------- Group membership ----------
  const groupMemberCandidates = sample(
    users.filter((u) => u.id !== group.userId),
    Math.min(9, users.length),
  );
  if (groupMemberCandidates.length > 0) {
    await prisma.groupMember.createMany({
      data: groupMemberCandidates.map((u, i) => ({ groupId: group.id, userId: u.id, role: i === 0 ? ('co_admin' as const) : ('member' as const) })),
      skipDuplicates: true,
    });
  }
  console.log(`Group members added: ~${groupMemberCandidates.length}`);

  // ---------- Drive RSVPs (for the "joined drives" profile tab) ----------
  if (drives.length > 0) {
    const rsvpRows = [];
    for (const u of sample(users, Math.min(10, users.length))) {
      for (const drive of sample(drives, randInt(1, Math.min(2, drives.length)))) {
        rsvpRows.push({ driveId: drive.id, userId: u.id, status: 'confirmed' as const });
      }
    }
    if (rsvpRows.length > 0) await prisma.driveRsvp.createMany({ data: rsvpRows, skipDuplicates: true });
    console.log(`Drive RSVPs: ~${rsvpRows.length} rows seeded`);
  } else {
    console.log('No drives found — skipping RSVPs (run seed_admin_demo.ts first for drive fixtures).');
  }

  // ---------- Posts, likes, stories, views, story-likes ----------
  // No natural unique key on posts/stories, so guard the whole block behind a marker check —
  // safe to rerun the script without piling up duplicate content every time.
  const alreadySeeded = await prisma.post.count({ where: { caption: { startsWith: 'DEMO Social' } } });
  if (alreadySeeded > 0) {
    console.log(`Posts/stories already seeded (${alreadySeeded} found) — skipping content creation.`);
  } else {
    let postCount = 0;
    let likeCount = 0;

    for (const u of users) {
      const memberOfGroup = groupMemberCandidates.some((m) => m.id === u.id);
      const postsForUser = randInt(1, 3);
      for (let i = 0; i < postsForUser; i++) {
        const tagWithGroup = memberOfGroup && i === 0;
        const tagWithDrive = drives.length > 0 && !tagWithGroup && Math.random() < 0.3;
        const mediaCount = randInt(1, 3);

        const post = await prisma.post.create({
          data: {
            authorType: 'user',
            userId: u.id,
            caption: pick(POST_CAPTIONS),
            createdAt: daysAgo(randInt(0, 45)),
            groupId: tagWithGroup ? group.id : undefined,
            driveId: tagWithDrive ? pick(drives).id : undefined,
            media: {
              create: Array.from({ length: mediaCount }, (_, order) => ({ url: img(`${u.handle}-post-${i}-${order}`), order })),
            },
          },
        });
        postCount++;

        const likers = sample(
          users.filter((o) => o.id !== u.id),
          randInt(0, Math.min(8, users.length - 1)),
        );
        if (likers.length > 0) {
          await prisma.postLike.createMany({ data: likers.map((l) => ({ postId: post.id, userId: l.id })), skipDuplicates: true });
          await prisma.post.update({ where: { id: post.id }, data: { likeCount: likers.length } });
          likeCount += likers.length;
        }
      }
    }

    // A handful more NGO/nursery posts beyond seed_admin_demo.ts's, so their grids have depth too.
    for (const ngo of ngos) {
      for (let i = 0; i < 2; i++) {
        const post = await prisma.post.create({
          data: {
            authorType: 'ngo',
            ngoId: ngo.id,
            caption: `DEMO Social — ${ngo.orgName} update: another great weekend of planting.`,
            createdAt: daysAgo(randInt(0, 40)),
            media: { create: [{ url: img(`${ngo.id}-social-${i}`), order: 0 }] },
          },
        });
        postCount++;
        const likers = sample(users, randInt(3, Math.min(12, users.length)));
        await prisma.postLike.createMany({ data: likers.map((l) => ({ postId: post.id, userId: l.id })), skipDuplicates: true });
        await prisma.post.update({ where: { id: post.id }, data: { likeCount: likers.length } });
        likeCount += likers.length;
      }
    }
    for (const nursery of nurseries) {
      const post = await prisma.post.create({
        data: {
          authorType: 'nursery',
          nurseryId: nursery.id,
          caption: `DEMO Social — ${nursery.nurseryName} just restocked, come take a look!`,
          createdAt: daysAgo(randInt(0, 30)),
          media: { create: [{ url: img(`${nursery.id}-social`), order: 0 }] },
        },
      });
      postCount++;
      const likers = sample(users, randInt(3, Math.min(10, users.length)));
      await prisma.postLike.createMany({ data: likers.map((l) => ({ postId: post.id, userId: l.id })), skipDuplicates: true });
      await prisma.post.update({ where: { id: post.id }, data: { likeCount: likers.length } });
      likeCount += likers.length;
    }

    console.log(`Posts: ${postCount}, post likes: ${likeCount}`);

    // ---------- Stories (active + a few expired, with views and likes) ----------
    let storyCount = 0;
    let storyViewCount = 0;
    let storyLikeCount = 0;

    async function createStoryWith(data: { authorType: 'user' | 'ngo' | 'nursery' | 'group'; userId?: string; ngoId?: string; nurseryId?: string; groupId?: string }, seed: string, expired = false) {
      const story = await prisma.story.create({
        data: {
          ...data,
          imageUrl: img(seed, 700, 1200),
          caption: pick(STORY_CAPTIONS),
          createdAt: expired ? daysAgo(2) : hoursFromNow(-randInt(0, 6)),
          expiresAt: expired ? daysAgo(1) : hoursFromNow(randInt(2, 22)),
        },
      });
      storyCount++;

      const viewers = sample(users, randInt(0, Math.min(10, users.length)));
      if (viewers.length > 0) {
        await prisma.storyView.createMany({ data: viewers.map((v) => ({ storyId: story.id, userId: v.id })), skipDuplicates: true });
        storyViewCount += viewers.length;
      }
      const likers = sample(viewers, randInt(0, viewers.length));
      if (likers.length > 0) {
        await prisma.storyLike.createMany({ data: likers.map((l) => ({ storyId: story.id, userId: l.id })), skipDuplicates: true });
        await prisma.story.update({ where: { id: story.id }, data: { likeCount: likers.length } });
        storyLikeCount += likers.length;
      }
      return story;
    }

    for (const u of users) {
      const storiesForUser = randInt(1, 2);
      for (let i = 0; i < storiesForUser; i++) {
        await createStoryWith({ authorType: 'user', userId: u.id }, `${u.handle}-story-${i}`);
      }
      if (Math.random() < 0.2) {
        await createStoryWith({ authorType: 'user', userId: u.id }, `${u.handle}-story-old`, true);
      }
    }
    for (const ngo of ngos) await createStoryWith({ authorType: 'ngo', ngoId: ngo.id }, `${ngo.id}-story`);
    for (const nursery of nurseries) await createStoryWith({ authorType: 'nursery', nurseryId: nursery.id }, `${nursery.id}-story`);
    for (const g of groups) await createStoryWith({ authorType: 'group', groupId: g.id }, `${g.id}-story`);

    console.log(`Stories: ${storyCount}, story views: ${storyViewCount}, story likes: ${storyLikeCount}`);
  }

  console.log('\nDone. Reuses password:', DEMO_PASSWORD, '(same as seed_admin_demo.ts).');
  console.log('All seeded emails end in @arth.demo — safe to filter/delete by that suffix.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
