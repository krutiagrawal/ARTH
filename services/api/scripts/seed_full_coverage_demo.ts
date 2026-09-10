import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Tops up every content table in the schema to at least TARGET rows, on top of whatever
// seed_admin_demo.ts / seed_social_demo.ts / packages/db/prisma/seed.ts already created —
// so the app has enough breadth (drives, orders, achievements unlocked, streaks, reports,
// etc.) to exercise every screen end-to-end instead of hitting empty states.
//
// Idempotent: every section computes `need = TARGET - currentCount` from the DB and only
// creates that many more rows, tagged with an "FC " (full-coverage) prefix or `fc-` email/
// handle/id prefix so reruns don't pile up duplicates. Safe to run repeatedly.
//
// Deliberately left alone (fixed reference/config data, not "content"):
//   achievements, ngo_achievements, group_achievements, nursery_achievements, tree_species,
//   forest_themes, decoration_types, daily_missions, eco_facts, forest_level_tiers,
//   approved_planting_locations, app_config, ecosystem_entries, stats — all managed by
//   packages/db/prisma/seed.ts (or, for the last three, are intentionally small fixed
//   marketing-page taxonomies).

const TARGET = 12;
const DEMO_PASSWORD = 'DemoPass123!';

function img(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}
function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}
function need(current: number) {
  return Math.max(0, TARGET - current);
}

async function findOrCreateUser(opts: {
  email: string;
  name: string;
  handle: string;
  role?: 'user' | 'ngo' | 'group' | 'nursery' | 'corporate';
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
        avatarEmoji: '🌱',
      },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
    return created;
  });
}

async function main() {
  console.log(`Seeding full-coverage demo data (target >= ${TARGET} rows per content table)...`);

  // ---------------------------------------------------------------------
  // Reference data (already seeded by packages/db/prisma/seed.ts)
  // ---------------------------------------------------------------------
  const species = await prisma.treeSpecies.findMany();
  const decorationTypes = await prisma.decorationType.findMany();
  const groupAchievements = await prisma.groupAchievement.findMany();
  const ngoAchievements = await prisma.ngoAchievement.findMany();
  const nurseryAchievements = await prisma.nurseryAchievement.findMany();
  const forestThemes = await prisma.forestTheme.findMany();
  const challenges = await prisma.challenge.findMany();
  if (species.length === 0) throw new Error('Run `npm run prisma:seed` (packages/db) first for catalog data.');

  const admin =
    (await prisma.user.findFirst({ where: { role: 'admin' } })) ??
    (await findOrCreateUser({ email: 'fc-admin@arth.demo', name: 'FC Admin', handle: 'fc_admin', role: 'user' }).then((u) =>
      prisma.user.update({ where: { id: u.id }, data: { role: 'admin' } }),
    ));

  // ---------------------------------------------------------------------
  // 1. Top up org profiles (Ngo/Nursery/Group/Corporate) to TARGET each
  // ---------------------------------------------------------------------
  let ngos = await prisma.ngoProfile.findMany();
  {
    const n = need(ngos.length);
    for (let i = 0; i < n; i++) {
      const idx = ngos.length + i + 1;
      const user = await findOrCreateUser({ email: `fc-ngo-${idx}@arth.demo`, name: `FC NGO Admin ${idx}`, handle: `fc_ngo_admin_${idx}`, role: 'ngo' });
      const profile = await prisma.ngoProfile.create({
        data: {
          userId: user.id,
          orgName: `FC Forest Trust ${idx}`,
          description: `DEMO FC — Forest Trust ${idx} runs local tree-planting drives and donation campaigns.`,
          website: `https://fc-forest-trust-${idx}.example.org`,
          logoUrl: img(`fc-ngo-${idx}`),
          city: pick(['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Thane'], idx),
          foundedYear: 2015 + (idx % 8),
          volunteerCountEstimate: 40 + idx * 5,
          status: 'approved',
          approvedAt: daysAgo(300 - idx),
        },
      });
      ngos.push(profile);
    }
    console.log(`NGOs: ${ngos.length}`);
  }

  let nurseries = await prisma.nurseryProfile.findMany();
  {
    const n = need(nurseries.length);
    for (let i = 0; i < n; i++) {
      const idx = nurseries.length + i + 1;
      const user = await findOrCreateUser({ email: `fc-nursery-${idx}@arth.demo`, name: `FC Nursery Admin ${idx}`, handle: `fc_nursery_admin_${idx}`, role: 'nursery' });
      const profile = await prisma.nurseryProfile.create({
        data: {
          userId: user.id,
          nurseryName: `FC Green Nursery ${idx}`,
          description: `DEMO FC — Green Nursery ${idx} grows native saplings for delivery.`,
          logoUrl: img(`fc-nursery-${idx}`),
          coverPhotoUrl: img(`fc-nursery-${idx}-cover`, 1200, 500),
          city: pick(['Pune', 'Mumbai', 'Thane', 'Nashik'], idx),
          contactPhone: `98765${(10000 + idx).toString().slice(-5)}`,
          status: 'approved',
          approvedAt: daysAgo(250 - idx),
          avgRating: 4.0 + (idx % 10) / 10,
          reviewCount: idx * 2,
        },
      });
      nurseries.push(profile);
    }
    console.log(`Nurseries: ${nurseries.length}`);
  }

  let groups = await prisma.groupProfile.findMany();
  {
    const n = need(groups.length);
    for (let i = 0; i < n; i++) {
      const idx = groups.length + i + 1;
      const user = await findOrCreateUser({ email: `fc-group-${idx}@arth.demo`, name: `FC Group Owner ${idx}`, handle: `fc_group_owner_${idx}`, role: 'group' });
      const profile = await prisma.groupProfile.create({
        data: {
          userId: user.id,
          groupName: `FC Green Circle ${idx}`,
          groupType: pick(['family', 'school', 'club', 'other'] as const, idx),
          description: `DEMO FC — Green Circle ${idx} plants trees together every month.`,
          logoUrl: img(`fc-group-${idx}`),
          city: pick(['Pune', 'Mumbai', 'Nashik'], idx),
          inviteCode: `FCGRP${idx.toString().padStart(3, '0')}`,
          status: 'active',
        },
      });
      groups.push(profile);
    }
    console.log(`Groups: ${groups.length}`);
  }

  let corporates = await prisma.corporateProfile.findMany();
  {
    const n = need(corporates.length);
    for (let i = 0; i < n; i++) {
      const idx = corporates.length + i + 1;
      const user = await findOrCreateUser({ email: `fc-corp-${idx}@arth.demo`, name: `FC CSR Lead ${idx}`, handle: `fc_corp_csr_${idx}`, role: 'corporate' });
      const profile = await prisma.corporateProfile.create({
        data: {
          userId: user.id,
          companyName: `FC Industries ${idx}`,
          description: `DEMO FC — Industries ${idx} sponsors tree-planting drives as part of its CSR program.`,
          logoUrl: img(`fc-corp-${idx}`),
          city: 'Pune',
          industry: pick(['Manufacturing', 'Finance', 'Technology', 'Retail'], idx),
          status: 'approved',
          approvedAt: daysAgo(180 - idx),
        },
      });
      corporates.push(profile);
    }
    console.log(`Corporates: ${corporates.length}`);
  }

  const users = await prisma.user.findMany({ where: { role: 'user' } });
  console.log(`Individual users available: ${users.length}`);

  // ---------------------------------------------------------------------
  // 2. Group ecosystem
  // ---------------------------------------------------------------------
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    // Members (skip the owner)
    const existingMembers = await prisma.groupMember.count({ where: { groupId: group.id } });
    if (existingMembers < 3) {
      const candidates = users.filter((u) => u.id !== group.userId).slice(gi * 3, gi * 3 + 3);
      if (candidates.length > 0) {
        await prisma.groupMember.createMany({
          data: candidates.map((u, i) => ({ groupId: group.id, userId: u.id, role: (i === 0 ? 'co_admin' : 'member') as 'co_admin' | 'member' })),
          skipDuplicates: true,
        });
      }
    }

    // Streak history — 3 recent days per group
    for (let d = 0; d < 3; d++) {
      await prisma.groupStreakHistory
        .create({ data: { groupId: group.id, activityDate: daysAgo(d), planted: d !== 1 } })
        .catch(() => undefined);
    }

    // One forest theme unlock
    const theme = pick(forestThemes, gi);
    await prisma.groupForestTheme
      .create({ data: { groupId: group.id, themeId: theme.id, unlocked: true, unlockedAt: daysAgo(30) } })
      .catch(() => undefined);

    // One achievement unlock
    const achievement = pick(groupAchievements, gi);
    await prisma.groupAchievementUnlock
      .create({ data: { groupId: group.id, achievementId: achievement.id, unlocked: true, progress: achievement.criteriaTarget ?? 1, unlockedAt: daysAgo(20) } })
      .catch(() => undefined);
  }
  console.log('Group streak history / forest themes / achievement unlocks seeded');

  const groupChallengeCount = await prisma.groupChallenge.count();
  {
    const n = need(groupChallengeCount);
    for (let i = 0; i < n; i++) {
      const group = pick(groups, groupChallengeCount + i);
      const title = `FC Challenge ${groupChallengeCount + i + 1}`;
      const challenge = await prisma.groupChallenge.create({
        data: {
          groupId: group.id,
          createdById: group.userId,
          title,
          description: 'DEMO FC — plant together and hit the group goal before the deadline.',
          goalType: pick(['trees_planted_count', 'cities_count', 'streak_days', 'rare_species_count'] as const, i),
          goalTotal: 10 + i,
          startsAt: daysAgo(5),
          endsAt: daysFromNow(10 + i),
        },
      });
      const members = await prisma.groupMember.findMany({ where: { groupId: group.id }, take: 3 });
      if (members.length > 0) {
        await prisma.groupChallengeParticipant.createMany({
          data: members.map((m, mi) => ({ challengeId: challenge.id, userId: m.userId, progress: mi + 1 })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`Group challenges: ${groupChallengeCount + n}`);
  }

  // ---------------------------------------------------------------------
  // 3. NGO ecosystem
  // ---------------------------------------------------------------------
  let drives = await prisma.drive.findMany();
  {
    const n = need(drives.length);
    for (let i = 0; i < n; i++) {
      const idx = drives.length + i + 1;
      const ngo = pick(ngos, idx);
      const statusPick = pick(['upcoming', 'completed', 'cancelled'] as const, idx);
      const drive = await prisma.drive.create({
        data: {
          ngoId: ngo.id,
          title: `FC Drive ${idx}`,
          description: 'DEMO FC — community planting drive.',
          lat: 18.5 + (idx % 10) * 0.01,
          lng: 73.8 + (idx % 10) * 0.01,
          city: ngo.city ?? 'Pune',
          startsAt: statusPick === 'completed' ? daysAgo(20 + idx) : daysFromNow(5 + idx),
          status: statusPick,
          transportMode: pick(['self_arrange', 'ngo_provided'] as const, idx),
          capacity: 30 + idx,
          photoUrl: img(`fc-drive-${idx}`),
        },
      });
      drives.push(drive);
    }
    console.log(`Drives: ${drives.length}`);
  }

  const pickupPointCount = await prisma.drivePickupPoint.count();
  {
    const n = need(pickupPointCount);
    for (let i = 0; i < n; i++) {
      const drive = pick(drives, i);
      await prisma.drivePickupPoint.create({
        data: { driveId: drive.id, address: `FC Pickup Point ${i + 1}, ${drive.city ?? 'Pune'}`, arrivalBy: drive.startsAt, order: i },
      });
    }
    console.log(`Drive pickup points: ${pickupPointCount + n}`);
  }

  let drivePlants = await prisma.drivePlant.findMany();
  {
    const n = need(drivePlants.length);
    for (let i = 0; i < n; i++) {
      const drive = pick(drives, i);
      const plant = await prisma.drivePlant.create({
        data: { driveId: drive.id, speciesName: pick(species, i).commonName, priceCents: 15000 + i * 500, order: i },
      });
      drivePlants.push(plant);
    }
    console.log(`Drive plants: ${drivePlants.length}`);
  }

  const sponsorshipCount = await prisma.drivePlantSponsorship.count();
  {
    const n = need(sponsorshipCount);
    for (let i = 0; i < n; i++) {
      const plant = pick(drivePlants, i);
      const user = pick(users, i);
      const stripeId = `pi_fc_plant_sponsor_${plant.id.slice(0, 8)}_${i}`;
      await prisma.drivePlantSponsorship
        .create({ data: { drivePlantId: plant.id, userId: user.id, amountCents: plant.priceCents, stripePaymentIntentId: stripeId, status: 'succeeded' } })
        .catch(() => undefined);
    }
    console.log(`Drive plant sponsorships: ${sponsorshipCount + n}`);
  }

  let adoptableTrees = await prisma.adoptableTree.findMany();
  {
    const n = need(adoptableTrees.length);
    for (let i = 0; i < n; i++) {
      const idx = adoptableTrees.length + i + 1;
      const ngo = pick(ngos, idx);
      const tree = await prisma.adoptableTree.create({
        data: {
          ngoId: ngo.id,
          nickname: `FC Adoptable Tree ${idx}`,
          speciesName: pick(species, idx).commonName,
          description: 'DEMO FC — a tree available for symbolic adoption.',
          photoUrl: img(`fc-adoptable-${idx}`),
          city: ngo.city ?? 'Pune',
          lat: 18.5 + (idx % 10) * 0.01,
          lng: 73.8 + (idx % 10) * 0.01,
          status: 'available',
        },
      });
      adoptableTrees.push(tree);
    }
    console.log(`Adoptable trees: ${adoptableTrees.length}`);
  }

  const adoptionCount = await prisma.adoption.count();
  {
    const n = need(adoptionCount);
    const unadopted = adoptableTrees.slice(0, n);
    for (let i = 0; i < unadopted.length; i++) {
      const tree = unadopted[i];
      const user = pick(users, i);
      await prisma.adoption
        .create({ data: { adoptableTreeId: tree.id, userId: user.id, message: 'DEMO FC — adopting this one!' } })
        .then(() => prisma.adoptableTree.update({ where: { id: tree.id }, data: { status: 'adopted' } }))
        .catch(() => undefined);
    }
    console.log(`Adoptions: ${adoptionCount + n}`);
  }

  let campaigns = await prisma.donationCampaign.findMany();
  {
    const n = need(campaigns.length);
    for (let i = 0; i < n; i++) {
      const idx = campaigns.length + i + 1;
      const ngo = pick(ngos, idx);
      const campaign = await prisma.donationCampaign.create({
        data: {
          ngoId: ngo.id,
          title: `FC Campaign ${idx}`,
          description: `DEMO FC — funding drive #${idx} for ${ngo.orgName}.`,
          goalAmountCents: 5000000 + idx * 100000,
          coverPhotoUrl: img(`fc-campaign-${idx}`, 900, 500),
          status: 'active',
        },
      });
      campaigns.push(campaign);
    }
    console.log(`Donation campaigns: ${campaigns.length}`);
  }

  const donationCount = await prisma.donation.count();
  {
    const n = need(donationCount);
    for (let i = 0; i < n; i++) {
      const campaign = pick(campaigns, i);
      const user = pick(users, i);
      const stripeId = `pi_fc_donation_${campaign.id.slice(0, 8)}_${i}`;
      await prisma.donation
        .create({ data: { campaignId: campaign.id, userId: user.id, amountCents: 50000 + i * 10000, stripePaymentIntentId: stripeId, status: 'succeeded' } })
        .catch(() => undefined);
    }
    console.log(`Donations: ${donationCount + n}`);
  }

  const portfolioCount = await prisma.ngoPortfolioEntry.count();
  {
    const n = need(portfolioCount);
    for (let i = 0; i < n; i++) {
      const idx = portfolioCount + i + 1;
      const ngo = pick(ngos, idx);
      const entry = await prisma.ngoPortfolioEntry.create({
        data: {
          ngoId: ngo.id,
          title: `FC Past Work ${idx}`,
          description: 'DEMO FC — a completed restoration project before this NGO joined the platform.',
          happenedOn: daysAgo(400 + idx * 10),
          city: ngo.city ?? 'Pune',
          treesPlanted: 100 + idx * 20,
          volunteersInvolved: 20 + idx * 3,
          media: { create: [{ url: img(`fc-portfolio-${idx}`, 800, 600), order: 0 }] },
        },
      });
      void entry;
    }
    console.log(`NGO portfolio entries: ${portfolioCount + n}`);
  }
  const portfolioMediaCount = await prisma.ngoPortfolioMedia.count();
  {
    const n = need(portfolioMediaCount);
    const entries = await prisma.ngoPortfolioEntry.findMany({ take: n });
    for (let i = 0; i < entries.length; i++) {
      await prisma.ngoPortfolioMedia.create({ data: { entryId: entries[i].id, url: img(`fc-portfolio-extra-${i}`, 800, 600), order: 1 } });
    }
    console.log(`NGO portfolio media: ${portfolioMediaCount + entries.length}`);
  }

  const staffCount = await prisma.staffMember.count();
  {
    const n = need(staffCount);
    for (let i = 0; i < n; i++) {
      const ngo = pick(ngos, i);
      await prisma.staffMember.create({
        data: { ngoId: ngo.id, name: `FC Staff ${i + 1}`, role: pick(['Field Coordinator', 'Volunteer Manager', 'Outreach Lead'], i), contactEmail: `fc.staff${i + 1}@arth.demo` },
      });
    }
    console.log(`Staff members: ${staffCount + n}`);
  }

  let plantedTrees = await prisma.plantedTree.findMany();
  {
    const n = need(plantedTrees.length);
    for (let i = 0; i < n; i++) {
      const idx = plantedTrees.length + i + 1;
      const ngo = pick(ngos, idx);
      const drive = pick(drives, idx);
      const tree = await prisma.plantedTree.create({
        data: {
          ngoId: ngo.id,
          driveId: drive.id,
          speciesName: pick(species, idx).commonName,
          label: `FC Planted #${idx}`,
          plantedAt: daysAgo(idx * 3),
          locationLabel: ngo.city ?? 'Pune',
          lat: 18.5 + (idx % 10) * 0.01,
          lng: 73.8 + (idx % 10) * 0.01,
          photoUrl: img(`fc-planted-${idx}`),
        },
      });
      plantedTrees.push(tree);
    }
    console.log(`Planted trees: ${plantedTrees.length}`);
  }

  const healthCheckCount = await prisma.treeHealthCheck.count();
  {
    const n = need(healthCheckCount);
    for (let i = 0; i < n; i++) {
      const tree = pick(plantedTrees, i);
      await prisma.treeHealthCheck.create({
        data: { plantedTreeId: tree.id, status: pick(['healthy', 'struggling', 'healthy', 'dead'] as const, i), notes: 'DEMO FC — routine health check.', checkedAt: daysAgo(i) },
      });
    }
    console.log(`Tree health checks: ${healthCheckCount + n}`);
  }

  for (let ni = 0; ni < ngos.length; ni++) {
    const ngo = ngos[ni];
    for (let w = 0; w < 2; w++) {
      const weekStart = new Date(daysAgo(ni + w * 7));
      weekStart.setHours(0, 0, 0, 0);
      await prisma.ngoStreakHistory.create({ data: { ngoId: ngo.id, weekStart, posted: w === 0 } }).catch(() => undefined);
    }
    const achievement = pick(ngoAchievements, ni);
    await prisma.ngoAchievementUnlock
      .create({ data: { ngoId: ngo.id, achievementId: achievement.id, unlocked: true, progress: achievement.criteriaTarget ?? 1, unlockedAt: daysAgo(15) } })
      .catch(() => undefined);
  }
  console.log('NGO streak history / achievement unlocks seeded');

  const csrCount = await prisma.csrSponsorship.count();
  {
    const n = need(csrCount);
    for (let i = 0; i < n; i++) {
      const corp = pick(corporates, i);
      const drive = pick(drives, i);
      await prisma.csrSponsorship.create({ data: { corporateId: corp.id, driveId: drive.id, amountCents: 1000000 + i * 50000, note: 'DEMO FC — CSR sponsorship.' } });
    }
    console.log(`CSR sponsorships: ${csrCount + n}`);
  }

  // ---------------------------------------------------------------------
  // 4. Nursery ecosystem
  // ---------------------------------------------------------------------
  let stock = await prisma.saplingStock.findMany();
  {
    const n = need(stock.length);
    for (let i = 0; i < n; i++) {
      const idx = stock.length + i + 1;
      const nursery = pick(nurseries, idx);
      const s = await prisma.saplingStock.create({
        data: {
          nurseryId: nursery.id,
          species: pick(species, idx).commonName,
          quantity: 10 + idx,
          isFree: idx % 3 === 0,
          priceCents: idx % 3 === 0 ? null : 10000 + idx * 500,
          photoUrl: img(`fc-stock-${idx}`),
        },
      });
      stock.push(s);
    }
    console.log(`Sapling stock: ${stock.length}`);
  }

  const reservationCount = await prisma.saplingReservation.count();
  {
    const n = need(reservationCount);
    for (let i = 0; i < n; i++) {
      const s = pick(stock, i);
      const user = pick(users, i);
      await prisma.saplingReservation.create({
        data: { stockId: s.id, nurseryId: s.nurseryId, userId: user.id, quantity: 1 + (i % 3), status: pick(['pending', 'fulfilled', 'declined'] as const, i), message: 'DEMO FC — reservation request.' },
      });
    }
    console.log(`Sapling reservations: ${reservationCount + n}`);
  }

  const ledgerCount = await prisma.saplingStockLedger.count();
  {
    const n = need(ledgerCount);
    for (let i = 0; i < n; i++) {
      const s = pick(stock, i);
      await prisma.saplingStockLedger.create({
        data: { nurseryId: s.nurseryId, stockId: s.id, species: s.species, delta: 5 + i, reason: 'manual_add' },
      });
    }
    console.log(`Sapling stock ledger rows: ${ledgerCount + n}`);
  }

  for (let ni = 0; ni < nurseries.length; ni++) {
    const nursery = nurseries[ni];
    for (let d = 0; d < 2; d++) {
      await prisma.nurseryStreakHistory.create({ data: { nurseryId: nursery.id, activityDate: daysAgo(ni + d), planted: true } }).catch(() => undefined);
    }
    const achievement = pick(nurseryAchievements, ni);
    await prisma.nurseryAchievementUnlock
      .create({ data: { nurseryId: nursery.id, achievementId: achievement.id, unlocked: true, progress: achievement.criteriaTarget ?? 1, unlockedAt: daysAgo(10) } })
      .catch(() => undefined);
  }
  console.log('Nursery streak history / achievement unlocks seeded');

  let addresses = await prisma.address.findMany();
  {
    const n = need(addresses.length);
    for (let i = 0; i < n; i++) {
      const idx = addresses.length + i + 1;
      const user = pick(users, idx);
      const addr = await prisma.address.create({
        data: { userId: user.id, label: `FC Address ${idx}`, line1: `${idx} FC Lane`, city: 'Pune', pincode: `4110${(idx % 90).toString().padStart(2, '0')}`, isDefault: false },
      });
      addresses.push(addr);
    }
    console.log(`Addresses: ${addresses.length}`);
  }

  const cartItemCount = await prisma.cartItem.count();
  {
    const n = need(cartItemCount);
    for (let i = 0; i < n; i++) {
      const s = pick(stock, i);
      const user = pick(users, i + 1);
      await prisma.cartItem
        .create({ data: { userId: user.id, nurseryId: s.nurseryId, stockId: s.id, quantity: 1 + (i % 4) } })
        .catch(() => undefined);
    }
    console.log(`Cart items: ${cartItemCount + n}`);
  }

  let orders = await prisma.order.findMany();
  {
    const n = need(orders.length);
    for (let i = 0; i < n; i++) {
      const idx = orders.length + i + 1;
      const s = pick(stock, idx);
      const user = pick(users, idx);
      let address = addresses.find((a) => a.userId === user.id);
      if (!address) {
        address = await prisma.address.create({ data: { userId: user.id, label: 'FC Home', line1: `${idx} FC Lane`, city: 'Pune', pincode: '411001', isDefault: true } });
        addresses.push(address);
      }
      const unit = s.priceCents ?? 20000;
      const statusPick = pick(['delivered', 'delivered', 'confirmed', 'packed', 'out_for_delivery', 'cancelled'] as const, idx);
      const stripeId = `pi_fc_order_${s.nurseryId.slice(0, 6)}_${idx}`;
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          nurseryId: s.nurseryId,
          addressId: address.id,
          status: statusPick,
          subtotalCents: unit,
          deliveryFeeCents: 4900,
          totalCents: unit + 4900,
          stripePaymentIntentId: stripeId,
          deliveredAt: statusPick === 'delivered' ? daysAgo(idx) : null,
          cancelledAt: statusPick === 'cancelled' ? daysAgo(idx) : null,
          items: { create: [{ stockId: s.id, species: s.species, quantity: 1, unitPriceCents: unit }] },
        },
      });
      orders.push(order);
    }
    console.log(`Orders: ${orders.length}`);
  }

  const orderItemCount = await prisma.orderItem.count();
  console.log(`Order items: ${orderItemCount} (1 per order, created above)`);

  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  {
    // order_reviews only makes sense against delivered orders — top those up specifically if the
    // status round-robin above didn't land enough of them.
    const shortfall = TARGET - deliveredOrders.length;
    for (let i = 0; i < shortfall; i++) {
      const idx = orders.length + i + 1;
      const s = pick(stock, idx);
      const user = pick(users, idx);
      let address = addresses.find((a) => a.userId === user.id);
      if (!address) {
        address = await prisma.address.create({ data: { userId: user.id, label: 'FC Home', line1: `${idx} FC Lane`, city: 'Pune', pincode: '411001', isDefault: true } });
        addresses.push(address);
      }
      const unit = s.priceCents ?? 20000;
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          nurseryId: s.nurseryId,
          addressId: address.id,
          status: 'delivered',
          subtotalCents: unit,
          deliveryFeeCents: 4900,
          totalCents: unit + 4900,
          stripePaymentIntentId: `pi_fc_order_delivered_${s.nurseryId.slice(0, 6)}_${idx}`,
          deliveredAt: daysAgo(idx),
          items: { create: [{ stockId: s.id, species: s.species, quantity: 1, unitPriceCents: unit }] },
        },
      });
      orders.push(order);
      deliveredOrders.push(order);
    }
  }
  const reviewCount = await prisma.orderReview.count();
  const unreviewedDelivered = await prisma.order.findMany({ where: { status: 'delivered', review: null } });
  {
    const n = Math.min(need(reviewCount), unreviewedDelivered.length);
    for (let i = 0; i < n; i++) {
      const order = unreviewedDelivered[i];
      await prisma.orderReview
        .create({ data: { orderId: order.id, userId: order.userId, nurseryId: order.nurseryId, nurseryRating: 4 + (i % 2), deliveryRating: 3 + (i % 3), comment: 'DEMO FC — smooth delivery, healthy saplings.' } })
        .catch(() => undefined);
    }
    console.log(`Order reviews: ${reviewCount + n}`);
  }

  const trackingCount = await prisma.deliveryTracking.count();
  {
    const withoutTracking = await prisma.order.findMany({ where: { tracking: null }, take: need(trackingCount) });
    for (const order of withoutTracking) {
      await prisma.deliveryTracking.create({ data: { orderId: order.id, provider: 'mock', riderName: 'FC Rider', riderPhone: '9876500099', etaMinutes: 30 } }).catch(() => undefined);
    }
    console.log(`Delivery tracking rows: ${trackingCount + withoutTracking.length}`);
  }

  const wishlistCount = await prisma.wishlistItem.count();
  {
    const n = need(wishlistCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      if (i % 2 === 0) {
        const nursery = pick(nurseries, i);
        await prisma.wishlistItem.create({ data: { userId: user.id, nurseryId: nursery.id } }).catch(() => undefined);
      } else {
        const s = pick(stock, i);
        await prisma.wishlistItem.create({ data: { userId: user.id, stockId: s.id } }).catch(() => undefined);
      }
    }
    console.log(`Wishlist items: ${wishlistCount + n}`);
  }

  // ---------------------------------------------------------------------
  // 5. Core user activity / gamification
  // ---------------------------------------------------------------------
  const treeCount = await prisma.tree.count();
  {
    const n = need(treeCount);
    for (let i = 0; i < n; i++) {
      const idx = treeCount + i + 1;
      const user = pick(users, idx);
      await prisma.tree.create({
        data: {
          userId: user.id,
          speciesId: pick(species, idx).id,
          nickname: `FC Tree ${idx}`,
          lat: 18.5 + (idx % 10) * 0.01,
          lng: 73.8 + (idx % 10) * 0.01,
          locationLabel: 'Pune',
          photoUrl: img(`fc-tree-${idx}`),
          aiVerificationStatus: pick(['verified', 'unverified', 'verified'] as const, idx),
          co2Absorbed: 2 + (idx % 5),
          xpEarned: 20 + idx,
        },
      });
    }
    console.log(`Trees: ${treeCount + n}`);
  }

  const streakHistoryCount = await prisma.streakHistory.count();
  {
    const n = need(streakHistoryCount);
    let created = 0;
    for (let i = 0; created < n; i++) {
      const user = pick(users, i);
      const ok = await prisma.streakHistory
        .create({ data: { userId: user.id, activityDate: daysAgo(i), planted: i % 4 !== 0 } })
        .then(() => true)
        .catch(() => false);
      if (ok) created++;
      if (i > n * 3) break; // safety valve against unlikely unique-collision stalls
    }
    console.log(`Streak history rows: ${streakHistoryCount + created}`);
  }

  const xpCount = await prisma.xpTransaction.count();
  {
    const n = need(xpCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      await prisma.xpTransaction.create({
        data: { userId: user.id, amount: 10 + i * 5, reason: pick(['tree_planted', 'mission_completed', 'achievement_unlocked', 'challenge_completed'] as const, i), balanceAfter: 100 + i * 5 },
      });
    }
    console.log(`XP transactions: ${xpCount + n}`);
  }

  let activityFeedRows = await prisma.activityFeed.findMany();
  {
    const n = need(activityFeedRows.length);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      const row = await prisma.activityFeed.create({
        data: { userId: user.id, type: pick(['tree_planted', 'achievement_unlocked', 'streak_milestone', 'friend_cheer', 'challenge_joined', 'challenge_completed'] as const, i), createdAt: daysAgo(i) },
      });
      activityFeedRows.push(row);
    }
    console.log(`Activity feed rows: ${activityFeedRows.length}`);
  }

  const reactionCount = await prisma.activityReaction.count();
  {
    const n = need(reactionCount);
    for (let i = 0; i < n; i++) {
      const activity = pick(activityFeedRows, i);
      const user = pick(users, i + 1);
      await prisma.activityReaction.create({ data: { activityId: activity.id, userId: user.id } }).catch(() => undefined);
    }
    console.log(`Activity reactions: ${reactionCount + n}`);
  }

  const challengeParticipantCount = await prisma.challengeParticipant.count();
  if (challenges.length > 0) {
    const n = need(challengeParticipantCount);
    for (let i = 0; i < n; i++) {
      const challenge = pick(challenges, i);
      const user = pick(users, i);
      await prisma.challengeParticipant.create({ data: { challengeId: challenge.id, userId: user.id, progress: i % (challenge.goalTotal || 5) } }).catch(() => undefined);
    }
    console.log(`Challenge participants: ${challengeParticipantCount + n}`);
  }

  const decorationCount = await prisma.decorationPlacement.count();
  {
    const n = need(decorationCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      const deco = pick(decorationTypes, i);
      await prisma.decorationPlacement.create({ data: { userId: user.id, decorationTypeId: deco.id, positionX: (i % 10) * 0.1, positionY: (i % 7) * 0.1 } });
    }
    console.log(`Decoration placements: ${decorationCount + n}`);
  }

  const blockCount = await prisma.block.count();
  {
    const n = need(blockCount);
    for (let i = 0; i < n && i + 1 < users.length; i++) {
      const blocker = pick(users, i);
      const blocked = users[(i + 1) % users.length];
      if (blocker.id === blocked.id) continue;
      await prisma.block.create({ data: { blockerId: blocker.id, blockedUserId: blocked.id } }).catch(() => undefined);
    }
    console.log(`Blocks: ${blockCount + n}`);
  }

  const savedPostCount = await prisma.savedPost.count();
  {
    const posts = await prisma.post.findMany({ take: TARGET });
    const n = Math.min(need(savedPostCount), posts.length);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      await prisma.savedPost.create({ data: { postId: posts[i].id, userId: user.id } }).catch(() => undefined);
    }
    console.log(`Saved posts: ${savedPostCount + n}`);
  }

  const pushTokenCount = await prisma.pushToken.count();
  {
    const n = need(pushTokenCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      await prisma.pushToken.create({ data: { userId: user.id, token: `fc-push-token-${i}-${user.id.slice(0, 8)}`, platform: i % 2 === 0 ? 'ios' : 'android' } }).catch(() => undefined);
    }
    console.log(`Push tokens: ${pushTokenCount + n}`);
  }

  const resetTokenCount = await prisma.passwordResetToken.count();
  {
    const n = need(resetTokenCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: `fc-reset-hash-${i}-${user.id.slice(0, 8)}`, expiresAt: daysFromNow(1), usedAt: i % 3 === 0 ? daysAgo(1) : null },
      }).catch(() => undefined);
    }
    console.log(`Password reset tokens: ${resetTokenCount + n}`);
  }

  const userThemeCount = await prisma.userForestTheme.count();
  {
    const n = need(userThemeCount);
    for (let i = 0; i < n; i++) {
      const user = pick(users, i);
      const theme = pick(forestThemes, i);
      await prisma.userForestTheme.create({ data: { userId: user.id, themeId: theme.id, unlocked: true, unlockedAt: daysAgo(i) } }).catch(() => undefined);
    }
    console.log(`User forest themes: ${userThemeCount + n}`);
  }

  const reportCount = await prisma.contentReport.count();
  {
    const n = need(reportCount);
    const reasons = ['spam', 'harassment', 'hate', 'misinformation', 'nudity', 'violence', 'other'] as const;
    for (let i = 0; i < n; i++) {
      const reporter = pick(users, i);
      const target = users[(i + 1) % users.length];
      if (reporter.id === target.id) continue;
      await prisma.contentReport
        .create({ data: { reporterId: reporter.id, targetType: 'user', targetId: target.id, reason: pick(reasons, i), status: pick(['open', 'actioned', 'dismissed'] as const, i), details: 'DEMO FC report.' } })
        .catch(() => undefined);
    }
    console.log(`Content reports: ${reportCount + n}`);
  }

  const auditCount = await prisma.adminActionLog.count();
  {
    const n = need(auditCount);
    for (let i = 0; i < n; i++) {
      const ngo = pick(ngos, i);
      await prisma.adminActionLog.create({ data: { actorUserId: admin.id, action: 'ngo.reviewed', targetType: 'NgoProfile', targetId: ngo.id, reason: 'DEMO FC — periodic compliance review.' } });
    }
    console.log(`Admin action logs: ${auditCount + n}`);
  }

  // ---------------------------------------------------------------------
  // 6. Competitions
  // ---------------------------------------------------------------------
  let competitions = await prisma.competition.findMany();
  {
    const n = need(competitions.length);
    for (let i = 0; i < n; i++) {
      const idx = competitions.length + i + 1;
      const c = await prisma.competition.create({
        data: { title: `FC Competition ${idx}`, tagline: 'DEMO FC — show off your greenest work.', deadline: daysFromNow(20 + idx), imageUrl: img(`fc-competition-${idx}`, 900, 500) },
      });
      competitions.push(c);
    }
    console.log(`Competitions: ${competitions.length}`);
  }

  let entries = await prisma.competitionEntry.findMany();
  {
    const n = need(entries.length);
    for (let i = 0; i < n; i++) {
      const idx = entries.length + i + 1;
      const competition = pick(competitions, idx);
      const user = pick(users, idx);
      const entry = await prisma.competitionEntry.create({
        data: { competitionId: competition.id, userId: user.id, title: `FC Entry ${idx}`, description: 'DEMO FC competition submission.', imageUrl: img(`fc-entry-${idx}`, 700, 500) },
      });
      entries.push(entry);
    }
    console.log(`Competition entries: ${entries.length}`);
  }

  const voteCount = await prisma.competitionEntryVote.count();
  {
    const n = need(voteCount);
    for (let i = 0; i < n; i++) {
      const entry = pick(entries, i);
      const voter = pick(users, i + 2);
      await prisma.competitionEntryVote.create({ data: { entryId: entry.id, userId: voter.id } }).catch(() => undefined);
    }
    console.log(`Competition entry votes: ${voteCount + n}`);
  }

  const newsletterCount = await prisma.newsletterSubscriber.count();
  {
    const n = need(newsletterCount);
    for (let i = 0; i < n; i++) {
      const email = `fc.newsletter${newsletterCount + i}@arth.demo`;
      await prisma.newsletterSubscriber.create({ data: { email } }).catch(() => undefined);
    }
    console.log(`Newsletter subscribers: ${newsletterCount + n}`);
  }

  // ---------------------------------------------------------------------
  // 7. Marketing content (apps/web pages — shared DB, additive only, no deletes)
  // ---------------------------------------------------------------------
  const forestCount = await prisma.forest.count();
  {
    const n = need(forestCount);
    const data = Array.from({ length: n }, (_, i) => {
      const idx = forestCount + i + 1;
      return {
        id: `fc-forest-${idx}`,
        name: `FC Forest ${idx}`,
        location: 'India',
        state: pick(['Maharashtra', 'Karnataka', 'Kerala', 'Rajasthan', 'Assam'], idx),
        trees: 1000 * idx,
        volunteers: 20 * idx,
        species: 10 + idx,
        established: `${2015 + (idx % 8)}`,
        imageUrl: img(`fc-forest-${idx}`, 900, 600),
        story: `DEMO FC — a community-led restoration forest, planting #${idx} of the network.`,
      };
    });
    if (data.length > 0) await prisma.forest.createMany({ data, skipDuplicates: true });
    console.log(`Forests: ${forestCount + data.length}`);
  }

  const legacyTreeCount = await prisma.legacyTree.count();
  {
    const n = need(legacyTreeCount);
    const data = Array.from({ length: n }, (_, i) => {
      const idx = legacyTreeCount + i + 1;
      return {
        id: `fc-legacy-tree-${idx}`,
        name: `FC Legacy Tree ${idx}`,
        species: pick(species, idx).commonName,
        owner: `FC Family ${idx}`,
        years: 10 + idx,
        location: 'India',
        imageUrl: img(`fc-legacy-${idx}`, 700, 500),
        quote: 'DEMO FC — planted for the next generation, cared for by ours.',
      };
    });
    if (data.length > 0) await prisma.legacyTree.createMany({ data, skipDuplicates: true });
    console.log(`Legacy trees: ${legacyTreeCount + data.length}`);
  }

  const blogCount = await prisma.blog.count();
  {
    const n = need(blogCount);
    const data = Array.from({ length: n }, (_, i) => {
      const idx = blogCount + i + 1;
      return {
        id: `fc-blog-${idx}`,
        title: `FC Blog Post ${idx}`,
        category: pick(['Wildlife', 'Plantation Guides', 'Native Species', 'Environmental News', 'Editorial'], idx),
        author: `FC Author ${idx}`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        minutes: 4 + (idx % 8),
        imageUrl: img(`fc-blog-${idx}`, 800, 500),
        excerpt: 'DEMO FC — a short read about growing and protecting native forests.',
      };
    });
    if (data.length > 0) await prisma.blog.createMany({ data, skipDuplicates: true });
    console.log(`Blogs: ${blogCount + data.length}`);
  }

  const partnerCount = await prisma.partner.count();
  {
    const n = need(partnerCount);
    const data = Array.from({ length: n }, (_, i) => ({ group: pick(['CSR', 'NGOs', 'Nurseries', 'Schools', 'Universities'], i), name: `FC Partner ${partnerCount + i + 1}` }));
    if (data.length > 0) await prisma.partner.createMany({ data });
    console.log(`Partners: ${partnerCount + data.length}`);
  }

  const ecosystemCount = await prisma.ecosystemEntry.count();
  if (ecosystemCount === 0) {
    await prisma.ecosystemEntry.createMany({
      data: [
        { id: 'individuals', title: 'Individuals', description: 'Plant a tree in your name. Watch it grow across the years.', long: 'Every individual on ARTH begins with a single sapling.' },
        { id: 'communities', title: 'Communities', description: 'Neighbourhoods, villages and citizen groups that plant together.', long: 'Community groves become landmarks with a shared page and story wall.' },
        { id: 'ngos', title: 'NGOs', description: 'Field organisations doing the tireless work of restoration.', long: 'Verified NGOs run large plantation drives with transparent dashboards.' },
        { id: 'nurseries', title: 'Nurseries', description: 'The quiet heroes who grow the saplings the world will plant.', long: 'Nurseries list native saplings by region and season.' },
        { id: 'organisations', title: 'Organisations', description: 'CSR & corporate partners planting forests, not press releases.', long: 'CSR partners adopt forests and receive measurable impact reports.' },
      ],
      skipDuplicates: true,
    });
    console.log('Ecosystem entries: 5 (fixed taxonomy, intentionally below target)');
  }

  const statCount = await prisma.stat.count();
  if (statCount === 0) {
    await prisma.stat.createMany({
      data: [
        { label: 'Trees Planted', value: 1284730, suffix: '' },
        { label: 'Volunteers', value: 84210, suffix: '' },
        { label: 'NGOs', value: 612, suffix: '' },
        { label: 'Cities', value: 214, suffix: '' },
        { label: 'Species', value: 3480, suffix: '' },
        { label: 'CSR Partners', value: 148, suffix: '' },
        { label: 'Nurseries', value: 372, suffix: '' },
        { label: 'Communities', value: 1290, suffix: '' },
      ],
    });
    console.log('Stats: 8 (fixed dashboard tiles, intentionally below target)');
  }

  const timelineCount = await prisma.timelineEntry.count();
  {
    const n = need(timelineCount);
    const data = Array.from({ length: n }, (_, i) => ({ year: `${2016 + timelineCount + i}`, title: `FC Milestone ${timelineCount + i + 1}`, text: 'DEMO FC — another year, another forest.' }));
    if (data.length > 0) await prisma.timelineEntry.createMany({ data });
    console.log(`Timeline entries: ${timelineCount + data.length}`);
  }

  const mapPointCount = await prisma.mapPoint.count();
  {
    const n = need(mapPointCount);
    const data = Array.from({ length: n }, (_, i) => ({ x: (i * 7) % 100, y: (i * 13) % 100, label: `FC Point ${mapPointCount + i + 1}` }));
    if (data.length > 0) await prisma.mapPoint.createMany({ data });
    console.log(`Map points: ${mapPointCount + data.length}`);
  }

  const leaderboardEntryCount = await prisma.leaderboardEntry.count();
  {
    const n = need(leaderboardEntryCount);
    const data = Array.from({ length: n }, (_, i) => ({
      category: pick(['NGOs', 'Cities', 'Schools', 'Companies', 'Forests'], i),
      name: `FC Leader ${leaderboardEntryCount + i + 1}`,
      place: 'India',
      score: 1000 * (i + 1),
    }));
    if (data.length > 0) await prisma.leaderboardEntry.createMany({ data });
    console.log(`Leaderboard entries: ${leaderboardEntryCount + data.length}`);
  }

  console.log('\nDone. All new accounts use password:', DEMO_PASSWORD);
  console.log('All new emails/ids start with "fc-"/"fc." — safe to filter/delete by that prefix.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
