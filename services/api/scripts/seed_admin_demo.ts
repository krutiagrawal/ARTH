import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Every row this script creates is tagged so it's easy to find/nuke later —
// emails end in @arth.demo, and titles/captions are prefixed "DEMO".
// Safe to rerun: everything is looked up by a distinctive field first.

const DEMO_PASSWORD = 'DemoPass123!';

function img(seed: string, w = 640, h = 480) {
  // picsum.photos serves real, publicly reachable placeholder photos keyed by
  // seed — unlike a fake "/uploads/..." path, these actually render in the
  // browser so the admin profile galleries look real during testing.
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function findOrCreateUser(opts: {
  email: string;
  name: string;
  handle: string;
  role: 'user' | 'ngo' | 'group' | 'nursery' | 'corporate';
  isBlocked?: boolean;
  blockedReason?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  if (existing) return existing;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role: opts.role,
        email: opts.email,
        passwordHash,
        passwordPlain: DEMO_PASSWORD,
        name: opts.name,
        handle: opts.handle,
        isBlocked: opts.isBlocked ?? false,
        blockedAt: opts.isBlocked ? new Date() : null,
        blockedReason: opts.isBlocked ? opts.blockedReason : null,
      },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
    return created;
  });
}

async function main() {
  console.log('Seeding admin-dashboard demo data...');

  // ---------- Admin actor (for AdminActionLog authorship) ----------
  let admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    admin = await findOrCreateUser({ email: 'demo.admin@arth.demo', name: 'Demo Admin', handle: 'demo_admin', role: 'user' });
    admin = await prisma.user.update({ where: { id: admin.id }, data: { role: 'admin' } });
  }
  const adminId = admin.id;
  console.log(`Admin actor: ${admin.email}`);

  // ---------- Individual users (some blocked) ----------
  const USER_SEED = [
    { email: 'aarav.mehta@arth.demo', name: 'Aarav Mehta', handle: 'aarav_mehta' },
    { email: 'diya.kulkarni@arth.demo', name: 'Diya Kulkarni', handle: 'diya_kulkarni' },
    { email: 'rohan.iyer@arth.demo', name: 'Rohan Iyer', handle: 'rohan_iyer' },
    { email: 'ishita.rao@arth.demo', name: 'Ishita Rao', handle: 'ishita_rao' },
    { email: 'kabir.singh@arth.demo', name: 'Kabir Singh', handle: 'kabir_singh' },
    { email: 'meera.nair@arth.demo', name: 'Meera Nair', handle: 'meera_nair' },
    {
      email: 'spam.account@arth.demo',
      name: 'Spam Account',
      handle: 'spam_account',
      isBlocked: true,
      blockedReason: 'Repeated spam links in post captions.',
    },
    {
      email: 'blocked.harassment@arth.demo',
      name: 'Problem User',
      handle: 'problem_user',
      isBlocked: true,
      blockedReason: 'Harassment reported by multiple members, confirmed on review.',
    },
  ];
  const users = [];
  for (const u of USER_SEED) users.push(await findOrCreateUser({ ...u, role: 'user' }));
  console.log(`Individual users: ${users.length}`);

  // ---------- Group ----------
  const groupOwner = await findOrCreateUser({ email: 'green.families@arth.demo', name: 'Green Families Owner', handle: 'green_families_owner', role: 'group' });
  let groupProfile = await prisma.groupProfile.findUnique({ where: { userId: groupOwner.id } });
  if (!groupProfile) {
    groupProfile = await prisma.groupProfile.create({
      data: {
        userId: groupOwner.id,
        groupName: 'Green Families Pune',
        groupType: 'family',
        description: 'A demo family group planting trees together every weekend.',
        logoUrl: img('group-green-families'),
        city: 'Pune',
        inviteCode: 'DEMOFAM1',
        status: 'active',
      },
    });
  }
  console.log('Group: 1');

  // ---------- NGOs (varied approval status) ----------
  const NGO_SEED = [
    { key: 'canopy-collective', orgName: 'Canopy Collective', status: 'approved' as const, city: 'Pune' },
    { key: 'roots-of-tomorrow', orgName: 'Roots of Tomorrow', status: 'pending' as const, city: 'Mumbai' },
    { key: 'evergreen-alliance', orgName: 'Evergreen Alliance', status: 'rejected' as const, city: 'Nashik' },
    { key: 'shade-network', orgName: 'Shade Network', status: 'suspended' as const, city: 'Nagpur' },
  ];
  const ngos: { profile: any; user: any }[] = [];
  for (const n of NGO_SEED) {
    const user = await findOrCreateUser({ email: `${n.key}@arth.demo`, name: `${n.orgName} Admin`, handle: `${n.key.replace(/-/g, '_')}_admin`, role: 'ngo' });
    let profile = await prisma.ngoProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.ngoProfile.create({
        data: {
          userId: user.id,
          orgName: n.orgName,
          description: `DEMO NGO — ${n.orgName} runs community tree-planting drives and donation campaigns around ${n.city}.`,
          website: `https://${n.key}.example.org`,
          contactPhone: '9876500001',
          logoUrl: img(n.key),
          city: n.city,
          foundedYear: 2015,
          volunteerCountEstimate: 120,
          status: n.status,
          rejectionReason: n.status === 'rejected' ? 'Incomplete registration documents on file.' : null,
          approvedAt: n.status === 'approved' || n.status === 'suspended' ? daysAgo(200) : null,
        },
      });
    }
    ngos.push({ profile, user });
  }
  console.log(`NGOs: ${ngos.length}`);

  // Posts + portfolio for the approved NGO
  const flagshipNgo = ngos[0].profile;
  for (let i = 1; i <= 3; i++) {
    const caption = `DEMO Update ${i} — ${flagshipNgo.orgName}`;
    const existing = await prisma.post.findFirst({ where: { ngoId: flagshipNgo.id, caption } });
    if (!existing) {
      await prisma.post.create({
        data: {
          authorType: 'ngo',
          ngoId: flagshipNgo.id,
          caption,
          createdAt: daysAgo(30 - i * 5),
          media: { create: [{ url: img(`${flagshipNgo.id}-update-${i}`, 800, 600), order: 0 }] },
        },
      });
    }
  }
  const portfolioTitle = 'DEMO 500-sapling riverside restoration';
  const existingPortfolio = await prisma.ngoPortfolioEntry.findFirst({ where: { ngoId: flagshipNgo.id, title: portfolioTitle } });
  if (!existingPortfolio) {
    await prisma.ngoPortfolioEntry.create({
      data: {
        ngoId: flagshipNgo.id,
        title: portfolioTitle,
        description: 'Restored a 2km riverside stretch with native species over three weekends.',
        happenedOn: daysAgo(400),
        city: flagshipNgo.city,
        treesPlanted: 500,
        volunteersInvolved: 80,
        media: { create: [{ url: img('portfolio-riverside', 800, 600), order: 0 }] },
      },
    });
  }
  console.log('NGO posts + portfolio seeded');

  // ---------- Nurseries (varied approval status) ----------
  const NURSERY_SEED = [
    { key: 'sunroot-nursery', nurseryName: 'Sunroot Nursery', status: 'approved' as const, city: 'Pune' },
    { key: 'budding-greens', nurseryName: 'Budding Greens', status: 'pending' as const, city: 'Pune' },
    { key: 'terra-sapling-co', nurseryName: 'Terra Sapling Co.', status: 'suspended' as const, city: 'Thane' },
  ];
  const nurseries: { profile: any; user: any }[] = [];
  for (const n of NURSERY_SEED) {
    const user = await findOrCreateUser({ email: `${n.key}@arth.demo`, name: `${n.nurseryName} Admin`, handle: `${n.key.replace(/-/g, '_')}_admin`, role: 'nursery' });
    let profile = await prisma.nurseryProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.nurseryProfile.create({
        data: {
          userId: user.id,
          nurseryName: n.nurseryName,
          description: `DEMO nursery — ${n.nurseryName} grows native and ornamental saplings for delivery around ${n.city}.`,
          logoUrl: img(n.key),
          coverPhotoUrl: img(`${n.key}-cover`, 1200, 500),
          city: n.city,
          contactPhone: '9876500002',
          status: n.status,
          approvedAt: n.status !== 'pending' ? daysAgo(150) : null,
          avgRating: 4.3,
          reviewCount: 18,
        },
      });
    }
    nurseries.push({ profile, user });
  }
  console.log(`Nurseries: ${nurseries.length}`);

  const flagshipNursery = nurseries[0].profile;
  const STOCK_SEED = [
    { species: 'Neem', quantity: 40, isFree: true, priceCents: null },
    { species: 'Mango', quantity: 15, isFree: false, priceCents: 24900 },
    { species: 'Banyan', quantity: 8, isFree: false, priceCents: 49900 },
  ];
  const stockRows = [];
  for (const s of STOCK_SEED) {
    let row = await prisma.saplingStock.findFirst({ where: { nurseryId: flagshipNursery.id, species: s.species } });
    if (!row) {
      row = await prisma.saplingStock.create({
        data: { nurseryId: flagshipNursery.id, species: s.species, quantity: s.quantity, isFree: s.isFree, priceCents: s.priceCents, photoUrl: img(`stock-${s.species.toLowerCase()}`) },
      });
    }
    stockRows.push(row);
  }
  const nurseryPostCaption = `DEMO Fresh batch of ${flagshipNursery.nurseryName} saplings ready`;
  const existingNurseryPost = await prisma.post.findFirst({ where: { nurseryId: flagshipNursery.id, caption: nurseryPostCaption } });
  if (!existingNurseryPost) {
    await prisma.post.create({
      data: {
        authorType: 'nursery',
        nurseryId: flagshipNursery.id,
        caption: nurseryPostCaption,
        createdAt: daysAgo(4),
        media: { create: [{ url: img('nursery-fresh-batch', 800, 600), order: 0 }] },
      },
    });
  }
  console.log('Nursery stock + posts seeded');

  // ---------- Corporates (varied approval status) ----------
  const CORPORATE_SEED = [
    { key: 'greenline-industries', companyName: 'Greenline Industries', status: 'approved' as const, industry: 'Manufacturing' },
    { key: 'northbridge-finance', companyName: 'Northbridge Finance', status: 'pending' as const, industry: 'Finance' },
    { key: 'skywave-tech', companyName: 'Skywave Tech', status: 'rejected' as const, industry: 'Technology' },
  ];
  const corporates: { profile: any; user: any }[] = [];
  for (const c of CORPORATE_SEED) {
    const user = await findOrCreateUser({ email: `${c.key}@arth.demo`, name: `${c.companyName} CSR Lead`, handle: `${c.key.replace(/-/g, '_')}_csr`, role: 'corporate' });
    let profile = await prisma.corporateProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.corporateProfile.create({
        data: {
          userId: user.id,
          companyName: c.companyName,
          description: `DEMO corporate account — ${c.companyName}'s CSR program sponsors tree-planting drives.`,
          logoUrl: img(c.key),
          city: 'Pune',
          industry: c.industry,
          status: c.status,
          rejectionReason: c.status === 'rejected' ? 'Company registration could not be verified.' : null,
          approvedAt: c.status === 'approved' ? daysAgo(90) : null,
        },
      });
    }
    corporates.push({ profile, user });
  }
  console.log(`Corporates: ${corporates.length}`);

  // ---------- Drives ----------
  const DRIVE_SEED = [
    { title: 'DEMO Riverside Plantation Drive', status: 'upcoming' as const, startsAt: daysAgo(-10) },
    { title: 'DEMO Hillside Reforestation Drive', status: 'completed' as const, startsAt: daysAgo(20) },
    { title: 'DEMO Monsoon Sapling Drive', status: 'cancelled' as const, startsAt: daysAgo(5) },
  ];
  const drives = [];
  for (const d of DRIVE_SEED) {
    let drive = await prisma.drive.findFirst({ where: { ngoId: flagshipNgo.id, title: d.title } });
    if (!drive) {
      drive = await prisma.drive.create({
        data: {
          ngoId: flagshipNgo.id,
          title: d.title,
          description: 'DEMO drive seeded for admin dashboard testing.',
          lat: 18.5204,
          lng: 73.8567,
          city: 'Pune',
          startsAt: d.startsAt,
          status: d.status,
          transportMode: 'self_arrange',
          photoUrl: img(d.title),
        },
      });
    }
    drives.push(drive);
  }
  console.log(`Drives: ${drives.length}`);

  // CSR sponsorship linking a corporate to a drive
  const approvedCorporate = corporates[0].profile;
  const existingSponsorship = await prisma.csrSponsorship.findFirst({ where: { corporateId: approvedCorporate.id, driveId: drives[1].id } });
  if (!existingSponsorship) {
    await prisma.csrSponsorship.create({ data: { corporateId: approvedCorporate.id, driveId: drives[1].id, amountCents: 15000000, note: 'DEMO sponsorship for hillside reforestation.' } });
  }

  // ---------- Donation campaign + donations ----------
  const campaignTitle = 'DEMO Clean Air Corridor Campaign';
  let campaign = await prisma.donationCampaign.findFirst({ where: { ngoId: flagshipNgo.id, title: campaignTitle } });
  if (!campaign) {
    campaign = await prisma.donationCampaign.create({
      data: { ngoId: flagshipNgo.id, title: campaignTitle, description: 'DEMO campaign funding a clean-air tree corridor.', goalAmountCents: 100000000, coverPhotoUrl: img('campaign-clean-air', 900, 500), status: 'active' },
    });
  }
  const DONATION_SEED = [
    { status: 'succeeded' as const, amountCents: 500000 },
    { status: 'succeeded' as const, amountCents: 250000 },
    { status: 'pending' as const, amountCents: 100000 },
    { status: 'failed' as const, amountCents: 75000 },
  ];
  for (let i = 0; i < DONATION_SEED.length; i++) {
    const d = DONATION_SEED[i];
    const stripeId = `pi_demo_donation_${campaign.id.slice(0, 8)}_${i}`;
    const existing = await prisma.donation.findUnique({ where: { stripePaymentIntentId: stripeId } });
    if (!existing) {
      await prisma.donation.create({
        data: { campaignId: campaign.id, userId: users[i % users.length].id, amountCents: d.amountCents, stripePaymentIntentId: stripeId, status: d.status },
      });
    }
  }
  console.log('Donation campaign + donations seeded');

  // ---------- Orders (needs an Address) ----------
  const orderCustomer = users[0];
  let address = await prisma.address.findFirst({ where: { userId: orderCustomer.id, label: 'DEMO Home' } });
  if (!address) {
    address = await prisma.address.create({
      data: { userId: orderCustomer.id, label: 'DEMO Home', line1: '12 Garden Lane', city: 'Pune', pincode: '411001', isDefault: true },
    });
  }
  const ORDER_SEED = [
    { status: 'delivered' as const },
    { status: 'confirmed' as const },
    { status: 'cancelled' as const },
  ];
  for (let i = 0; i < ORDER_SEED.length; i++) {
    const o = ORDER_SEED[i];
    const stripeId = `pi_demo_order_${flagshipNursery.id.slice(0, 8)}_${i}`;
    const existing = await prisma.order.findFirst({ where: { stripePaymentIntentId: stripeId } });
    if (!existing) {
      const stock = stockRows[i % stockRows.length];
      await prisma.order.create({
        data: {
          userId: orderCustomer.id,
          nurseryId: flagshipNursery.id,
          addressId: address.id,
          status: o.status,
          subtotalCents: stock.priceCents ?? 0,
          deliveryFeeCents: 4900,
          totalCents: (stock.priceCents ?? 0) + 4900,
          stripePaymentIntentId: stripeId,
          deliveredAt: o.status === 'delivered' ? daysAgo(2) : null,
          cancelledAt: o.status === 'cancelled' ? daysAgo(1) : null,
          items: { create: [{ stockId: stock.id, species: stock.species, quantity: 1, unitPriceCents: stock.priceCents ?? 0 }] },
        },
      });
    }
  }
  console.log('Orders seeded');

  // ---------- Trees (tree-verification queue + some already reviewed) ----------
  const species = await prisma.treeSpecies.findFirst();
  if (species) {
    const TREE_SEED = [
      { nickname: 'DEMO Unreviewed Neem', aiVerificationStatus: 'unverified' as const, reviewed: false },
      { nickname: 'DEMO Flagged Photo', aiVerificationStatus: 'rejected' as const, reviewed: false },
      { nickname: 'DEMO Already Approved', aiVerificationStatus: 'verified' as const, reviewed: true },
    ];
    for (let i = 0; i < TREE_SEED.length; i++) {
      const t = TREE_SEED[i];
      const existing = await prisma.tree.findFirst({ where: { userId: users[i].id, nickname: t.nickname } });
      if (!existing) {
        await prisma.tree.create({
          data: {
            userId: users[i].id,
            speciesId: species.id,
            nickname: t.nickname,
            lat: 18.5204,
            lng: 73.8567,
            locationLabel: 'Pune',
            photoUrl: img(`tree-${i}`),
            aiVerificationStatus: t.aiVerificationStatus,
            reviewedByAdminId: t.reviewed ? adminId : null,
            reviewedAt: t.reviewed ? daysAgo(1) : null,
          },
        });
      }
    }
    console.log('Trees seeded (verification queue populated)');
  } else {
    console.log('Skipped trees — no TreeSpecies found, run `npm run prisma:seed` first for catalog data.');
  }

  // ---------- Reports (accounts on priority, plus content) ----------
  const reporter = users[0];
  const secondReporter = users[1];
  async function ensureReport(reporterId: string, targetType: any, targetId: string, reason: any, status: 'open' | 'actioned' | 'dismissed', details?: string) {
    const existing = await prisma.contentReport.findUnique({ where: { reporterId_targetType_targetId: { reporterId, targetType, targetId } } });
    if (existing) return existing;
    return prisma.contentReport.create({ data: { reporterId, targetType, targetId, reason, status, details, reviewedAt: status === 'open' ? null : daysAgo(1), reviewedByUserId: status === 'open' ? null : adminId } });
  }
  // Account reports (the priority queue)
  await ensureReport(reporter.id, 'user', users[5].id, 'harassment', 'open', 'Sending unsolicited messages repeatedly.');
  await ensureReport(secondReporter.id, 'ngo', ngos[2].profile.userId, 'misinformation', 'open', 'Exaggerated impact numbers on their profile.');
  await ensureReport(reporter.id, 'nursery', nurseries[1].profile.userId, 'spam', 'dismissed', 'Turned out to be a false alarm.');
  await ensureReport(secondReporter.id, 'corporate', corporates[2].profile.userId, 'other', 'open', 'Suspicious CSR claims.');
  // Content report against a post
  const demoPost = await prisma.post.findFirst({ where: { ngoId: flagshipNgo.id } });
  if (demoPost) {
    await ensureReport(reporter.id, 'post', demoPost.id, 'spam', 'actioned', 'Promotional spam unrelated to tree planting.');
  }
  console.log('Reports seeded');

  // ---------- Competition + entries ----------
  const competitionTitle = 'DEMO Best Backyard Forest 2026';
  let competition = await prisma.competition.findFirst({ where: { title: competitionTitle } });
  if (!competition) {
    competition = await prisma.competition.create({
      data: { title: competitionTitle, tagline: 'Show off your greenest corner.', deadline: daysAgo(-30), imageUrl: img('competition-backyard-forest', 900, 500) },
    });
  }
  for (let i = 0; i < 3; i++) {
    const entryTitle = `DEMO Entry ${i + 1}`;
    const existing = await prisma.competitionEntry.findFirst({ where: { competitionId: competition.id, title: entryTitle } });
    if (!existing) {
      await prisma.competitionEntry.create({
        data: { competitionId: competition.id, userId: users[i].id, title: entryTitle, description: 'DEMO competition submission.', imageUrl: img(`entry-${i}`, 700, 500), votesCount: (i + 1) * 12 },
      });
    }
  }
  console.log('Competition + entries seeded');

  // ---------- Newsletter subscribers ----------
  for (let i = 0; i < 5; i++) {
    const email = `newsletter.demo${i}@arth.demo`;
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!existing) await prisma.newsletterSubscriber.create({ data: { email } });
  }
  console.log('Newsletter subscribers seeded');

  // ---------- Audit log ----------
  const AUDIT_SEED = [
    { action: 'ngo.approved', targetType: 'NgoProfile', targetId: ngos[0].profile.id, reason: null },
    { action: 'ngo.rejected', targetType: 'NgoProfile', targetId: ngos[2].profile.id, reason: 'Incomplete registration documents on file.' },
    { action: 'nursery.suspended', targetType: 'NurseryProfile', targetId: nurseries[2].profile.id, reason: 'Multiple unresolved order complaints.' },
    { action: 'user.blocked', targetType: 'User', targetId: users[6].id, reason: 'Repeated spam links in post captions.' },
    { action: 'user.blocked', targetType: 'User', targetId: users[7].id, reason: 'Harassment reported by multiple members, confirmed on review.' },
  ];
  for (const a of AUDIT_SEED) {
    const existing = await prisma.adminActionLog.findFirst({ where: { action: a.action, targetId: a.targetId } });
    if (!existing) await prisma.adminActionLog.create({ data: { actorUserId: adminId, action: a.action, targetType: a.targetType, targetId: a.targetId, reason: a.reason } });
  }
  console.log('Audit log entries seeded');

  console.log('\nDone. Demo accounts use password:', DEMO_PASSWORD);
  console.log('All seeded emails end in @arth.demo — safe to filter/delete by that suffix.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
