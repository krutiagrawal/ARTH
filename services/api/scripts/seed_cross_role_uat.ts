import { PrismaClient } from '@arth/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Starting-state data for the cross-role UAT cases (ARTH_MOBILE_UAT_TEST_CASES.md,
// CROSS-ING-001 .. CROSS-APR-006). Deliberately leaves each scenario *before* the transition it
// tests (e.g. no RSVP yet on "XR Drive Open", no ARTH sapling units minted for in-flight bulk
// offers). Every account is xr-*@arth.demo, every title is prefixed "XR ".
//
//   npx tsx scripts/seed_cross_role_uat.ts            # idempotent top-up
//   npx tsx scripts/seed_cross_role_uat.ts --reset    # delete all xr-* users (cascades) then reseed
//
// Needs `npm run prisma:seed` (tree species) to have been run first.

const PASSWORD = 'DemoPass123!';
const RESET = process.argv.includes('--reset');

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
const img = (seed: string, w = 640, h = 480) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

let created = 0;
const note = (what: string) => {
  created++;
  console.log(`  + ${what}`);
};

type Role = 'user' | 'ngo' | 'nursery' | 'delivery_partner';

async function ensureUser(opts: { key: string; name: string; role: Role; isBlocked?: boolean; blockedReason?: string }) {
  const email = `${opts.key}@arth.demo`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const passwordHash = await hashPassword(PASSWORD);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        role: opts.role,
        email,
        passwordHash,
        name: opts.name,
        handle: opts.key.replace(/-/g, '_'),
        isBlocked: opts.isBlocked ?? false,
        blockedAt: opts.isBlocked ? new Date() : null,
        blockedReason: opts.isBlocked ? opts.blockedReason : null,
      },
    });
    await tx.userSettings.create({ data: { userId: u.id } });
    return u;
  });
  note(`user ${email}`);
  return user;
}

type Status = 'pending' | 'approved' | 'rejected' | 'suspended';

async function ensureNgo(opts: {
  key: string;
  orgName: string;
  status: Status;
  followPolicy?: 'open' | 'approval';
  rejectionReason?: string;
}) {
  const user = await ensureUser({ key: opts.key, name: `${opts.orgName} Admin`, role: 'ngo' });
  let profile = await prisma.ngoProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.ngoProfile.create({
      data: {
        userId: user.id,
        orgName: opts.orgName,
        description: `XR test NGO — ${opts.orgName}. Runs tree-planting drives and campaigns around Pune.`,
        contactPhone: '9876500101',
        logoUrl: img(opts.key),
        city: 'Pune',
        foundedYear: 2016,
        volunteerCountEstimate: 80,
        status: opts.status,
        followPolicy: opts.followPolicy ?? 'open',
        rejectionReason: opts.status === 'rejected' || opts.status === 'suspended' ? opts.rejectionReason ?? null : null,
        approvedAt: opts.status === 'approved' || opts.status === 'suspended' ? daysAgo(120) : null,
      },
    });
    note(`ngo profile ${opts.orgName} [${opts.status}]`);
  }
  return { user, profile };
}

async function ensureNursery(opts: {
  key: string;
  name: string;
  status: Status;
  followPolicy?: 'open' | 'approval';
  rejectionReason?: string;
  lat?: number;
  lng?: number;
}) {
  const user = await ensureUser({ key: opts.key, name: `${opts.name} Admin`, role: 'nursery' });
  let profile = await prisma.nurseryProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.nurseryProfile.create({
      data: {
        userId: user.id,
        nurseryName: opts.name,
        description: `XR test nursery — ${opts.name}. Native and ornamental saplings, pickup and delivery in Pune.`,
        logoUrl: img(opts.key),
        coverPhotoUrl: img(`${opts.key}-cover`, 1200, 500),
        city: 'Pune',
        contactPhone: '9876500201',
        lat: opts.lat ?? 18.5204,
        lng: opts.lng ?? 73.8567,
        status: opts.status,
        followPolicy: opts.followPolicy ?? 'open',
        rejectionReason: opts.status === 'rejected' || opts.status === 'suspended' ? opts.rejectionReason ?? null : null,
        approvedAt: opts.status === 'approved' || opts.status === 'suspended' ? daysAgo(120) : null,
        offersPickup: true,
        offersDelivery: true,
        deliveryRadiusKm: 15,
        deliveryFeeCents: 4000,
        minDeliveryOrderCents: 10000,
        pickupWindows: [
          { label: 'Morning', startTime: '09:00', endTime: '12:00' },
          { label: 'Evening', startTime: '16:00', endTime: '19:00' },
        ],
        pickupInstructions: 'Ask for the XR counter at the main gate.',
        // Denormalized reputation inputs for approved nurseries; reviews below keep avg/count in sync.
        trustScore: opts.status === 'approved' ? 60 : null,
      },
    });
    note(`nursery profile ${opts.name} [${opts.status}]`);
  }
  return { user, profile };
}

async function findSpecies(names: string[]) {
  const all = await prisma.treeSpecies.findMany({ where: { isActive: true }, orderBy: { key: 'asc' } });
  if (all.length === 0) throw new Error('No TreeSpecies found — run `npm run prisma:seed` first.');
  return names.map((n, i) => all.find((s) => s.commonName.toLowerCase().includes(n.toLowerCase())) ?? all[i % all.length]);
}

async function main() {
  if (RESET) {
    const res = await prisma.user.deleteMany({ where: { email: { startsWith: 'xr-', endsWith: '@arth.demo' } } });
    console.log(`--reset: deleted ${res.count} xr-* users (and everything cascading from them)`);
  }
  console.log('Seeding cross-role UAT data...');

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) console.log('  ! No admin account exists — create one (create:admin) for the CROSS-APR prerequisites.');

  // ---------- Individuals ----------
  const indA = await ensureUser({ key: 'xr-ind-a', name: 'XR Individual A', role: 'user' });
  const indB = await ensureUser({ key: 'xr-ind-b', name: 'XR Individual B', role: 'user' });
  const fillers: { id: string }[] = [];
  for (let i = 1; i <= 4; i++) fillers.push(await ensureUser({ key: `xr-fill-${i}`, name: `XR Filler ${i}`, role: 'user' }));

  for (const u of [indA, indB]) {
    if (!(await prisma.address.findFirst({ where: { userId: u.id } }))) {
      await prisma.address.create({
        data: {
          userId: u.id,
          label: 'Home',
          line1: '12 Baner Road',
          landmark: 'Near Balewadi High Street',
          city: 'Pune',
          pincode: '411045',
          lat: 18.559,
          lng: 73.7868,
          isDefault: true,
        },
      });
      note(`address for ${u.email}`);
    }
  }

  // ---------- NGOs ----------
  const ngoOpen = await ensureNgo({ key: 'xr-ngo-open', orgName: 'XR Green Pune Trust', status: 'approved', followPolicy: 'open' });
  const ngoApproval = await ensureNgo({ key: 'xr-ngo-approval', orgName: 'XR Approval Needed Trust', status: 'approved', followPolicy: 'approval' });
  await ensureNgo({ key: 'xr-ngo-pending', orgName: 'XR Pending NGO', status: 'pending' });
  await ensureNgo({ key: 'xr-ngo-rejected', orgName: 'XR Rejected NGO', status: 'rejected', rejectionReason: 'XR: registration certificate unreadable.' });
  await ensureNgo({ key: 'xr-ngo-suspended', orgName: 'XR Suspended NGO', status: 'suspended', rejectionReason: 'XR: repeated policy violations.' });
  await ensureNgo({ key: 'xr-ngo-block', orgName: 'XR Block-Me NGO', status: 'approved' });

  // ---------- Nurseries ----------
  const nurOpen = await ensureNursery({ key: 'xr-nur-open', name: 'XR Sunroot Nursery', status: 'approved', followPolicy: 'open', lat: 18.5204, lng: 73.8567 });
  const nurApproval = await ensureNursery({ key: 'xr-nur-approval', name: 'XR Leafy Lane Nursery', status: 'approved', followPolicy: 'approval', lat: 18.5314, lng: 73.8446 });
  await ensureNursery({ key: 'xr-nur-pending', name: 'XR Pending Nursery', status: 'pending' });
  await ensureNursery({ key: 'xr-nur-rejected', name: 'XR Rejected Nursery', status: 'rejected', rejectionReason: 'XR: nursery photo does not show stock.' });
  await ensureNursery({ key: 'xr-nur-suspended', name: 'XR Suspended Nursery', status: 'suspended', rejectionReason: 'XR: quality complaints.' });
  await ensureNursery({ key: 'xr-nur-approved2', name: 'XR Suspend-Me Nursery', status: 'approved' });
  await ensureNursery({ key: 'xr-nur-block', name: 'XR Block-Me Nursery', status: 'approved' });

  // ---------- Delivery partner ----------
  const riderUser = await ensureUser({ key: 'xr-rider', name: 'XR Rider', role: 'delivery_partner' });
  let rider = await prisma.deliveryPartnerProfile.findUnique({ where: { userId: riderUser.id } });
  if (!rider) {
    rider = await prisma.deliveryPartnerProfile.create({
      data: { userId: riderUser.id, nurseryId: nurOpen.profile.id, phone: '9876500301', isActive: true },
    });
    note('delivery partner profile xr-rider');
  }

  const [neem, mango, banyan, tulsi, peepal] = await findSpecies(['neem', 'mango', 'banyan', 'tulsi', 'peepal']);

  // ---------- Nursery stock (xr-nur-open + xr-nur-approval) ----------
  async function ensureStock(nurseryId: string, species: { id: string; commonName: string }, quantity: number, priceCents: number | null) {
    const existing = await prisma.saplingStock.findFirst({ where: { nurseryId, speciesId: species.id } });
    if (existing) return existing;
    const stock = await prisma.saplingStock.create({
      data: {
        nurseryId,
        species: species.commonName,
        speciesId: species.id,
        quantity,
        isFree: priceCents == null,
        priceCents,
        photoUrl: img(`xr-stock-${species.id}`),
        lowStockThreshold: 5,
        ageLabel: '6 months',
        heightLabel: '1 ft',
        potSize: '8 inch',
        suitableEnvironments: ['urban', 'garden'],
      },
    });
    await prisma.saplingStockLedger.create({
      data: { nurseryId, stockId: stock.id, species: species.commonName, delta: quantity, reason: 'manual_add' },
    });
    note(`stock ${species.commonName} x${quantity} @ nursery ${nurseryId.slice(0, 6)}`);
    return stock;
  }
  const stockNeem = await ensureStock(nurOpen.profile.id, neem, 40, 15000);
  const stockMango = await ensureStock(nurOpen.profile.id, mango, 30, 24900);
  await ensureStock(nurOpen.profile.id, banyan, 20, 49900);
  await ensureStock(nurOpen.profile.id, tulsi, 3, 9900); // low_stock
  await ensureStock(nurOpen.profile.id, peepal, 0, 19900); // out_of_stock
  await ensureStock(nurApproval.profile.id, neem, 25, 14000);
  await ensureStock(nurApproval.profile.id, mango, 12, 25900);

  // ---------- Follow requests (ING-007, IN-006) ----------
  async function ensurePendingFollow(followerId: string, target: { ngoId?: string; nurseryId?: string }, ownerUserId: string) {
    const where = target.ngoId ? { followerId, ngoId: target.ngoId } : { followerId, nurseryId: target.nurseryId };
    if (await prisma.follow.findFirst({ where })) return;
    const follow = await prisma.follow.create({ data: { followerId, ...target, status: 'pending' } });
    await prisma.notification.create({
      data: { userId: ownerUserId, type: 'follow_request', actorUserId: followerId, followId: follow.id },
    });
    note(`pending follow request → ${target.ngoId ? 'NGO' : 'nursery'}`);
  }
  await ensurePendingFollow(indB.id, { ngoId: ngoApproval.profile.id }, ngoApproval.user.id);
  await ensurePendingFollow(indB.id, { nurseryId: nurApproval.profile.id }, nurApproval.user.id);

  // ---------- Drives (ING-001/002) ----------
  const ngoId = ngoOpen.profile.id;
  async function ensureDrive(title: string, data: Record<string, any>) {
    const existing = await prisma.drive.findFirst({ where: { ngoId, title } });
    if (existing) return existing;
    const d = await prisma.drive.create({
      data: {
        ngoId,
        title,
        description: `${title} — XR cross-role test drive.`,
        photoUrl: img(title),
        address: 'Vetal Tekdi, Pune',
        city: 'Pune',
        lat: 18.5167,
        lng: 73.8333,
        durationMinutes: 180,
        ...data,
      } as any,
    });
    note(`drive ${title}`);
    return d;
  }

  const driveOpen = await ensureDrive('XR Drive Open', {
    startsAt: daysAhead(10),
    capacity: 5,
    transportMode: 'ngo_provided',
    status: 'upcoming',
  });
  if (!(await prisma.drivePickupPoint.findFirst({ where: { driveId: driveOpen.id } }))) {
    await prisma.drivePickupPoint.create({
      data: { driveId: driveOpen.id, address: 'Shivajinagar Metro Station', arrivalBy: daysAhead(10), order: 0 },
    });
  }
  const openPlants: { id: string; priceCents: number }[] = [];
  for (const [i, [name, price]] of (
    [
      ['Neem', 15000],
      ['Mango', 24900],
      ['Banyan', 49900],
    ] as [string, number][]
  ).entries()) {
    let p = await prisma.drivePlant.findFirst({ where: { driveId: driveOpen.id, speciesName: name } });
    if (!p) p = await prisma.drivePlant.create({ data: { driveId: driveOpen.id, speciesName: name, priceCents: price, order: i } });
    openPlants.push(p);
  }

  const driveFull = await ensureDrive('XR Drive Almost Full', { startsAt: daysAhead(12), capacity: 5, status: 'upcoming' });
  for (const f of fillers) {
    await prisma.driveRsvp.upsert({
      where: { driveId_userId: { driveId: driveFull.id, userId: f.id } },
      update: {},
      create: { driveId: driveFull.id, userId: f.id, status: 'confirmed' },
    });
  }

  const drivePast = await ensureDrive('XR Drive Past', { startsAt: daysAgo(14), capacity: 20, status: 'completed' });
  await prisma.driveRsvp.upsert({
    where: { driveId_userId: { driveId: drivePast.id, userId: indA.id } },
    update: {},
    create: { driveId: drivePast.id, userId: indA.id, status: 'confirmed', attended: true, hoursLogged: 3 },
  });
  await prisma.driveRsvp.upsert({
    where: { driveId_userId: { driveId: drivePast.id, userId: indB.id } },
    update: {},
    create: { driveId: drivePast.id, userId: indB.id, status: 'confirmed', attended: false, hoursLogged: 0 },
  });

  // One historical succeeded sponsorship so the Reports baseline is non-zero (ING-002 adds to it).
  if (!(await prisma.drivePlantSponsorship.findUnique({ where: { stripePaymentIntentId: 'pi_xr_sponsor_base' } }))) {
    await prisma.drivePlantSponsorship.create({
      data: { drivePlantId: openPlants[0].id, userId: indB.id, amountCents: openPlants[0].priceCents, status: 'succeeded', stripePaymentIntentId: 'pi_xr_sponsor_base' },
    });
    note('baseline sponsorship (succeeded)');
  }

  // ---------- Campaign + donations in every status (ING-003) ----------
  let campaign = await prisma.donationCampaign.findFirst({ where: { ngoId, title: 'XR Campaign' } });
  if (!campaign) {
    campaign = await prisma.donationCampaign.create({
      data: {
        ngoId,
        title: 'XR Campaign',
        description: 'XR test campaign — restore the Vetal Tekdi slope.',
        goalAmountCents: 10_000_000,
        coverPhotoUrl: img('xr-campaign', 1000, 500),
        status: 'active',
      },
    });
    note('campaign XR Campaign');
  }
  const donations: [string, 'succeeded' | 'pending' | 'failed' | 'refunded', number][] = [
    ['pi_xr_don_succeeded', 'succeeded', 50000],
    ['pi_xr_don_pending', 'pending', 25000],
    ['pi_xr_don_failed', 'failed', 10000],
    ['pi_xr_don_refunded', 'refunded', 30000],
  ];
  for (const [pi, status, amountCents] of donations) {
    if (await prisma.donation.findUnique({ where: { stripePaymentIntentId: pi } })) continue;
    await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        userId: indB.id,
        amountCents,
        status,
        stripePaymentIntentId: pi,
        receiptNumber: status === 'succeeded' ? 'XR-RCPT-0001' : null,
        message: `XR ${status} donation`,
      },
    });
    note(`donation ${status}`);
  }

  // ---------- Adoptable trees (ING-004/005/006) ----------
  const treeDefs: [string, string, 'available' | 'adopted'][] = [
    ['XR Adopt Me', 'Neem', 'available'],
    ['XR Release Me', 'Mango', 'available'],
    ['XR Remove Me', 'Banyan', 'available'],
    ['XR Taken Tree', 'Peepal', 'adopted'],
  ];
  for (const [nickname, speciesName, status] of treeDefs) {
    let tree = await prisma.adoptableTree.findFirst({ where: { ngoId, nickname } });
    if (!tree) {
      tree = await prisma.adoptableTree.create({
        data: {
          ngoId,
          nickname,
          speciesName,
          description: `${nickname} — a young ${speciesName} on Vetal Tekdi.`,
          photoUrl: img(nickname),
          locationLabel: 'Vetal Tekdi, Pune',
          city: 'Pune',
          lat: 18.5167,
          lng: 73.8333,
          status,
        },
      });
      note(`adoptable tree ${nickname} [${status}]`);
    }
    if (status === 'adopted' && !(await prisma.adoption.findUnique({ where: { adoptableTreeId: tree.id } }))) {
      await prisma.adoption.create({ data: { adoptableTreeId: tree.id, userId: indB.id, message: 'XR: looking after this one.' } });
    }
  }

  // ---------- NGO posts + one open report (ING-008) ----------
  const reportPosts = [];
  for (let i = 1; i <= 2; i++) {
    const caption = `XR NGO Update ${i}`;
    let post = await prisma.post.findFirst({ where: { ngoId, caption } });
    if (!post) {
      post = await prisma.post.create({
        data: {
          authorType: 'ngo',
          ngoId,
          caption,
          media: { create: [{ url: img(`xr-post-${i}`, 800, 600), order: 0 }] },
        },
      });
      note(`post ${caption}`);
    }
    reportPosts.push(post);
  }
  if (!(await prisma.contentReport.findFirst({ where: { reporterId: indA.id, targetType: 'post', targetId: reportPosts[0].id } }))) {
    await prisma.contentReport.create({
      data: { reporterId: indA.id, targetType: 'post', targetId: reportPosts[0].id, postId: reportPosts[0].id, reason: 'spam', details: 'XR pre-existing report', status: 'open' },
    });
    note('open content report on XR NGO Update 1');
  }

  // ---------- Bulk requirements + offers (NN-001..005) ----------
  const [bulkSpecies] = await findSpecies(['teak']);
  const bulkStock = await ensureStock(nurOpen.profile.id, bulkSpecies, 10, 12000);
  void bulkStock;

  async function ensureRequirement(note_: string, data: Record<string, any>) {
    const existing = await prisma.bulkRequirement.findFirst({ where: { ngoId, notes: note_ } });
    if (existing) return existing;
    const r = await prisma.bulkRequirement.create({
      data: { ngoId, city: 'Pune', lat: 18.5167, lng: 73.8333, notes: note_, ...data } as any,
    });
    note(`bulk requirement ${note_}`);
    return r;
  }
  async function ensureResponse(requirementId: string, data: Record<string, any>) {
    const existing = await prisma.bulkRequirementResponse.findUnique({
      where: { requirementId_nurseryId: { requirementId, nurseryId: nurOpen.profile.id } },
    });
    if (existing) return existing;
    return prisma.bulkRequirementResponse.create({
      data: { requirementId, nurseryId: nurOpen.profile.id, canDeliver: true, canPickup: true, ...data } as any,
    });
  }

  // NN-001: clean, no offers
  await ensureRequirement('XR NN-001 full lifecycle', { speciesNote: 'Any native species', quantityNeeded: 100, neededByDate: daysAhead(30), status: 'open' });
  // NN-002: species-specific, nursery stock is only 10
  await ensureRequirement('XR NN-002 over-offer', { speciesId: bulkSpecies.id, quantityNeeded: 50, neededByDate: daysAhead(30), status: 'open' });
  // NN-003: handed off, NGO enters wrong code
  const r3 = await ensureRequirement('XR NN-003 wrong code', { speciesNote: 'Teak or any hardwood', quantityNeeded: 20, neededByDate: daysAhead(20), status: 'open' });
  await ensureResponse(r3.id, { quantityOffered: 20, priceCents: 12000, message: 'XR handed off', status: 'handed_off', handoffCode: '5934', respondedAt: daysAgo(1) });
  // NN-004: proposed offer, NGO cancels
  const r4 = await ensureRequirement('XR NN-004 cancel after offer', { speciesNote: 'Fruit trees', quantityNeeded: 30, neededByDate: daysAhead(25), status: 'open' });
  await ensureResponse(r4.id, { quantityOffered: 10, priceCents: 9000, message: 'XR proposed offer', status: 'proposed' });
  // NN-005: expired with an outstanding proposed offer
  const r5 = await ensureRequirement('XR NN-005 expired with offer', { speciesNote: 'Shade trees', quantityNeeded: 25, neededByDate: daysAgo(3), status: 'expired' });
  await ensureResponse(r5.id, { quantityOffered: 8, priceCents: 8000, message: 'XR offer on expired requirement', status: 'proposed' });
  // Historical completed fulfilment (reputation realism). Units + ledger exist only for this one.
  const rDone = await ensureRequirement('XR historical fulfilled', {
    speciesId: bulkSpecies.id,
    quantityNeeded: 5,
    quantityFulfilled: 5,
    neededByDate: daysAgo(20),
    status: 'fulfilled',
  });
  const doneResp = await ensureResponse(rDone.id, { quantityOffered: 5, priceCents: 12000, status: 'fulfilled', handoffCode: '1111', respondedAt: daysAgo(18) });
  if ((await prisma.arthSaplingUnit.count({ where: { bulkRequirementResponseId: doneResp.id } })) === 0) {
    for (let i = 0; i < 5; i++) {
      await prisma.arthSaplingUnit.create({
        data: {
          bulkRequirementResponseId: doneResp.id,
          nurseryId: nurOpen.profile.id,
          speciesId: bulkSpecies.id,
          speciesNameSnapshot: bulkSpecies.commonName,
          supplyDate: daysAgo(18),
          status: 'collected',
          collectedAt: daysAgo(18),
        },
      });
    }
    await prisma.saplingStockLedger.create({
      data: { nurseryId: nurOpen.profile.id, species: bulkSpecies.commonName, delta: -5, reason: 'bulk_requirement_fulfilled', createdAt: daysAgo(18) },
    });
    note('historical bulk fulfilment (5 units)');
  }

  // ---------- Orders (IN-002..005, TREE-003) ----------
  const addrA = await prisma.address.findFirstOrThrow({ where: { userId: indA.id } });
  const FEE = 4000;
  const PLATFORM = 1000;

  type OrderStatus =
    | 'pending_payment' | 'confirmed' | 'packed' | 'ready_for_pickup' | 'out_for_delivery'
    | 'picked_up' | 'delivered' | 'plantation_verified' | 'cancelled';

  async function ensureOrder(opts: {
    pi: string;
    status: OrderStatus;
    pickup: boolean;
    stock: { id: string; species: string; priceCents: number | null };
    qty?: number;
    handoffCode?: string;
    withRider?: boolean;
    units?: boolean;
    ageDays: number;
  }) {
    const existing = await prisma.order.findUnique({ where: { stripePaymentIntentId: opts.pi } });
    if (existing) return existing;
    const qty = opts.qty ?? 2;
    const unit = opts.stock.priceCents ?? 0;
    const subtotal = unit * qty;
    const fee = opts.pickup ? 0 : FEE;
    const t = (offsetHours: number) => new Date(daysAgo(opts.ageDays).getTime() + offsetHours * 3_600_000);
    const s = opts.status;
    const confirmedOrLater = s !== 'pending_payment';
    const order = await prisma.order.create({
      data: {
        userId: indA.id,
        nurseryId: nurOpen.profile.id,
        addressId: opts.pickup ? null : addrA.id,
        fulfillmentType: opts.pickup ? 'pickup' : 'delivery',
        status: s,
        subtotalCents: subtotal,
        deliveryFeeCents: fee,
        platformFeeCents: PLATFORM,
        totalCents: subtotal + fee + PLATFORM,
        stripePaymentIntentId: opts.pi,
        scheduledFor: opts.pickup ? daysAhead(2) : null,
        pickupWindowLabel: opts.pickup ? 'Morning' : null,
        customerNote: `XR order (${s})`,
        handoffCode: confirmedOrLater && s !== 'cancelled' ? opts.handoffCode ?? null : null,
        confirmedAt: confirmedOrLater ? t(0) : null,
        packedAt: ['packed', 'ready_for_pickup', 'out_for_delivery', 'picked_up', 'delivered', 'plantation_verified'].includes(s) ? t(2) : null,
        readyForPickupAt: ['ready_for_pickup', 'picked_up', 'plantation_verified'].includes(s) && opts.pickup ? t(3) : null,
        outForDeliveryAt: ['out_for_delivery', 'delivered'].includes(s) ? t(3) : null,
        pickedUpAt: ['picked_up', 'plantation_verified'].includes(s) && opts.pickup ? t(5) : null,
        deliveredAt: s === 'delivered' ? t(6) : null,
        plantationVerifiedAt: s === 'plantation_verified' ? t(48) : null,
        cancelledAt: s === 'cancelled' ? t(1) : null,
        items: { create: [{ stockId: opts.stock.id, species: opts.stock.species, quantity: qty, unitPriceCents: unit }] },
      },
      include: { items: true },
    });
    if (!opts.pickup && ['out_for_delivery', 'delivered'].includes(s) && opts.withRider) {
      await prisma.deliveryTracking.create({
        data: {
          orderId: order.id,
          provider: 'nursery_staff',
          deliveryPartnerId: rider!.id,
          riderName: riderUser.name,
          riderPhone: '9876500301',
          startedAt: t(3),
          lat: 18.53,
          lng: 73.84,
          etaMinutes: s === 'out_for_delivery' ? 25 : 0,
        },
      });
    }
    if (opts.units) {
      for (let i = 0; i < qty; i++) {
        await prisma.arthSaplingUnit.create({
          data: {
            orderItemId: order.items[0].id,
            nurseryId: nurOpen.profile.id,
            speciesNameSnapshot: opts.stock.species,
            supplyDate: t(5),
            status: 'collected',
            collectedAt: t(6),
          },
        });
      }
    }
    note(`order ${opts.pi} [${s}${opts.pickup ? ', pickup' : ', delivery'}]`);
    return order;
  }

  // Scenario starts
  await ensureOrder({ pi: 'pi_xr_in002_pickup', status: 'confirmed', pickup: true, stock: stockNeem, handoffCode: '4821', ageDays: 0 });
  await ensureOrder({ pi: 'pi_xr_in003_delivery', status: 'confirmed', pickup: false, stock: stockMango, handoffCode: '7305', ageDays: 0 });
  await ensureOrder({ pi: 'pi_xr_in004_cancel', status: 'confirmed', pickup: false, stock: stockNeem, handoffCode: '2290', ageDays: 0 });
  // One of every other status for list coverage
  await ensureOrder({ pi: 'pi_xr_list_pending', status: 'pending_payment', pickup: false, stock: stockNeem, ageDays: 1 });
  await ensureOrder({ pi: 'pi_xr_list_packed', status: 'packed', pickup: false, stock: stockMango, handoffCode: '3187', ageDays: 2 });
  await ensureOrder({ pi: 'pi_xr_list_ready', status: 'ready_for_pickup', pickup: true, stock: stockNeem, handoffCode: '6642', ageDays: 2 });
  await ensureOrder({ pi: 'pi_xr_list_ofd', status: 'out_for_delivery', pickup: false, stock: stockMango, handoffCode: '9051', withRider: true, ageDays: 1 });
  await ensureOrder({ pi: 'pi_xr_list_pickedup', status: 'picked_up', pickup: true, stock: stockNeem, handoffCode: '1478', units: true, ageDays: 5 });
  await ensureOrder({ pi: 'pi_xr_list_cancelled', status: 'cancelled', pickup: false, stock: stockMango, ageDays: 6 });
  // IN-005 start: delivered, no review yet (individual writes one)
  await ensureOrder({ pi: 'pi_xr_in005_delivered', status: 'delivered', pickup: false, stock: stockNeem, handoffCode: '5513', withRider: true, units: true, ageDays: 4 });
  // Delivered + review without response (nursery responds live), and plantation_verified + review with response
  const delivered2 = await ensureOrder({ pi: 'pi_xr_review_noresp', status: 'delivered', pickup: false, stock: stockMango, handoffCode: '8826', withRider: true, units: true, ageDays: 8 });
  const verified = await ensureOrder({ pi: 'pi_xr_review_resp', status: 'plantation_verified', pickup: true, stock: stockNeem, handoffCode: '7712', units: true, ageDays: 12 });

  if (!(await prisma.orderReview.findUnique({ where: { orderId: delivered2.id } }))) {
    await prisma.orderReview.create({
      data: {
        orderId: delivered2.id,
        userId: indA.id,
        nurseryId: nurOpen.profile.id,
        deliveryPartnerId: rider.id,
        nurseryRating: 5,
        deliveryRating: 4,
        comment: 'XR: healthy saplings, rider was a bit late.',
      },
    });
    note('review (no nursery response)');
  }
  if (!(await prisma.orderReview.findUnique({ where: { orderId: verified.id } }))) {
    await prisma.orderReview.create({
      data: {
        orderId: verified.id,
        userId: indA.id,
        nurseryId: nurOpen.profile.id,
        nurseryRating: 4,
        comment: 'XR: good packaging.',
        nurseryResponse: 'Thanks for the feedback!',
        nurseryRespondedAt: daysAgo(10),
      },
    });
    note('review (with nursery response)');
  }
  // Denormalized rollups to match the two reviews above (avg of 5 and 4; rider rated 4 once).
  await prisma.nurseryProfile.update({ where: { id: nurOpen.profile.id }, data: { avgRating: 4.5, reviewCount: 2 } });
  await prisma.deliveryPartnerProfile.update({ where: { id: rider.id }, data: { avgRating: 4, reviewCount: 1 } });

  // IN-001 is ON HOLD in the doc; one pending reservation is cheap to keep around.
  if (!(await prisma.saplingReservation.findFirst({ where: { userId: indA.id, nurseryId: nurApproval.profile.id } }))) {
    const freeStock = await ensureStock(nurApproval.profile.id, tulsi, 15, null);
    await prisma.saplingReservation.create({
      data: { stockId: freeStock.id, nurseryId: nurApproval.profile.id, userId: indA.id, quantity: 2, status: 'pending', message: 'XR reservation' },
    });
    note('pending reservation (IN-001, on hold)');
  }

  // ---------- Plantation: zones, planted trees, health checks (TREE-002) ----------
  const drivePlantation = await ensureDrive('XR Drive Plantation', { startsAt: daysAgo(30), capacity: 30, status: 'completed' });
  const zones: Record<string, { id: string }> = {};
  for (const name of ['XR Zone A', 'XR Zone B']) {
    zones[name] =
      (await prisma.plantationZone.findUnique({ where: { driveId_name: { driveId: drivePlantation.id, name } } })) ??
      (await prisma.plantationZone.create({ data: { ngoId, driveId: drivePlantation.id, name } }));
  }
  const healthPlan: (('healthy' | 'struggling' | 'dead') | null)[] = ['healthy', 'healthy', 'healthy', 'struggling', 'dead', null, null, null];
  for (let i = 0; i < 8; i++) {
    const publicId = `XR-PT-${String(i + 1).padStart(4, '0')}`;
    if (await prisma.plantedTree.findUnique({ where: { publicId } })) continue;
    const tree = await prisma.plantedTree.create({
      data: {
        ngoId,
        driveId: drivePlantation.id,
        zoneId: (i < 5 ? zones['XR Zone A'] : zones['XR Zone B']).id,
        speciesName: i % 2 === 0 ? 'Neem' : 'Mango',
        label: `XR Tree ${i + 1}`,
        plantedAt: daysAgo(30),
        locationLabel: 'Vetal Tekdi, Pune',
        lat: 18.5167 + i * 0.0002,
        lng: 73.8333 + i * 0.0002,
        publicId,
      },
    });
    const status = healthPlan[i];
    if (status) {
      await prisma.treeHealthCheck.create({ data: { plantedTreeId: tree.id, status, notes: `XR seeded ${status}`, checkedAt: daysAgo(5) } });
    }
  }
  console.log('  plantation zones + 8 planted trees ensured');

  printCheatSheet();
  console.log(`\nDone. Created ${created} new rows/entities (0 on a clean rerun).`);
}

function printCheatSheet() {
  console.log(`
All accounts: <email>@arth.demo  /  ${PASSWORD}

Individuals: xr-ind-a (buyer/RSVPer), xr-ind-b (donor/adopter/follower). Fillers xr-fill-1..4.
NGOs:        xr-ngo-open (main), xr-ngo-approval (follow=approval), xr-ngo-pending / -rejected / -suspended, xr-ngo-block
Nurseries:   xr-nur-open (main, stock+orders+rider), xr-nur-approval (follow=approval), xr-nur-pending / -rejected / -suspended, xr-nur-approved2 (suspend live), xr-nur-block
Rider:       xr-rider (delivery partner of xr-nur-open)

CROSS-ING-001  ind-a RSVPs "XR Drive Open" (cap 5, 0 RSVPs); NGO checks volunteers (ind-a/ind-b have attended/no-show on "XR Drive Past")
CROSS-ING-002  ind-a sponsors a plant on "XR Drive Open"; NGO Reports (baseline: 1 succeeded sponsorship)
CROSS-ING-003  ind-a donates to "XR Campaign" (baseline: 4 donations, one per status)
CROSS-ING-004/5/6  adopt "XR Adopt Me"; release "XR Release Me"; remove "XR Remove Me" (adopt first)
CROSS-ING-007  xr-ind-b already has a pending request to xr-ngo-approval; use ind-a to follow, or accept ind-b's request
CROSS-ING-008  ind-a already reported "XR NGO Update 1"; report "XR NGO Update 2" for a fresh one
CROSS-NN-001   NGO req "XR NN-001 full lifecycle" (no offers)   NN-002 "over-offer" (stock 10 vs need 50)
CROSS-NN-003   "wrong code" has handed_off offer, code 5934      NN-004 "cancel after offer" has a proposed offer
CROSS-NN-005   "expired with offer" is expired w/ proposed offer
CROSS-IN-002   ind-a order pi_xr_in002_pickup (confirmed, pickup, code 4821) → nursery packs/readies/confirms
CROSS-IN-003   ind-a order pi_xr_in003_delivery (confirmed, delivery, code 7305) → nursery assigns xr-rider
CROSS-IN-004   ind-a order pi_xr_in004_cancel (confirmed) → cancel from app
CROSS-IN-005   ind-a delivered order pi_xr_in005_delivered has no review; pi_xr_review_noresp has a review awaiting nursery reply
CROSS-IN-006   xr-ind-b has a pending request to xr-nur-approval
CROSS-IN-007   xr-nur-open + xr-nur-approval both stock Neem/Mango
CROSS-TREE-001 ind-a has no trees (clean counts)  TREE-002 "XR Drive Plantation": 8 trees, 5 checked, 3 not
CROSS-TREE-003 use the orders above; collected units already exist for picked_up/delivered/verified orders
CROSS-APR-001/2 xr-ngo-pending (admin approves) / xr-ngo-rejected & -suspended preset
CROSS-APR-003/4/5 xr-nur-pending, xr-nur-rejected (resubmit), xr-nur-suspended preset; xr-nur-approved2 for live suspend
CROSS-APR-006  admin account-blocks xr-ngo-block / xr-nur-block (approved, not blocked yet)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
