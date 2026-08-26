import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Fixture credentials — keep these in sync with apps/web/e2e/global-setup.ts,
// which imports nothing from here (this runs as a separate `tsx` process
// shelled out from Playwright's globalSetup) so the values are duplicated
// there deliberately, not derived.
const TEST_ADMIN = { email: 'admin.e2e@example.com', password: 'AdminPass123!', name: 'E2E Admin', handle: 'admin_e2e' };
const TEST_DONOR = { email: 'donor.e2e@example.com', password: 'DonorPass123!', name: 'E2E Donor', handle: 'donor_e2e' };
const APPROVED_NGO_EMAIL = 'vriksha.test@example.com';

async function upsertUser({
  email,
  password,
  name,
  handle,
  role,
}: {
  email: string;
  password: string;
  name: string;
  handle: string;
  role: 'admin' | 'user';
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role) {
      return prisma.user.update({ where: { id: existing.id }, data: { role } });
    }
    return existing;
  }
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { role, email, passwordHash, passwordPlain: password, name, handle },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
    return created;
  });
}

// Idempotent: seeds one drive+rsvp, one campaign+donation, one adopted tree —
// just enough real data for Volunteers/Donations/Reports/Overview to render
// non-empty state without depending on whatever the Drives/Campaigns/Trees
// CRUD specs happen to create and clean up during their own runs.
async function seedNgoActivity(ngoId: string, donorId: string) {
  let drive = await prisma.drive.findFirst({ where: { ngoId, title: 'E2E Seed Drive' } });
  if (!drive) {
    drive = await prisma.drive.create({
      data: {
        ngoId,
        title: 'E2E Seed Drive',
        description: 'Seed data for automated end-to-end testing — safe to ignore.',
        lat: 12.9716,
        lng: 77.5946,
        locationLabel: 'Seed City',
        startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'completed',
      },
    });
  }
  await prisma.driveRsvp.upsert({
    where: { driveId_userId: { driveId: drive.id, userId: donorId } },
    update: {},
    create: { driveId: drive.id, userId: donorId, status: 'confirmed' },
  });

  let campaign = await prisma.donationCampaign.findFirst({ where: { ngoId, title: 'E2E Seed Campaign' } });
  if (!campaign) {
    campaign = await prisma.donationCampaign.create({
      data: {
        ngoId,
        title: 'E2E Seed Campaign',
        description: 'Seed data for automated end-to-end testing — safe to ignore.',
        goalAmountCents: 500000,
      },
    });
  }
  const existingDonation = await prisma.donation.findFirst({ where: { campaignId: campaign.id, userId: donorId } });
  if (!existingDonation) {
    await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        userId: donorId,
        amountCents: 25000,
        stripePaymentIntentId: `pi_e2e_seed_${campaign.id}`,
        status: 'succeeded',
      },
    });
  }

  // Upsert-and-heal rather than skip-if-exists: the trees e2e spec exercises
  // "release adoption" on this exact row, which flips it back to available —
  // re-running this script (as global-setup does on every `playwright test`
  // invocation) must restore both the `adopted` status and the Adoption
  // relation, not just leave whatever state the last run's test left behind.
  let tree = await prisma.adoptableTree.findFirst({ where: { ngoId, nickname: 'E2E Seed Tree' } });
  if (!tree) {
    tree = await prisma.adoptableTree.create({
      data: {
        ngoId,
        nickname: 'E2E Seed Tree',
        speciesName: 'Neem',
        description: 'Seed data for automated end-to-end testing — safe to ignore.',
        lat: 12.9716,
        lng: 77.5946,
        locationLabel: 'Seed City',
        status: 'adopted',
      },
    });
  } else if (tree.status !== 'adopted') {
    tree = await prisma.adoptableTree.update({ where: { id: tree.id }, data: { status: 'adopted' } });
  }
  const existingAdoption = await prisma.adoption.findUnique({ where: { adoptableTreeId: tree.id } });
  if (!existingAdoption) {
    await prisma.adoption.create({
      data: { adoptableTreeId: tree.id, userId: donorId, message: 'Excited to adopt this one!' },
    });
  }
}

async function main() {
  await upsertUser({ ...TEST_ADMIN, role: 'admin' });
  const donor = await upsertUser({ ...TEST_DONOR, role: 'user' });

  const ngoUser = await prisma.user.findUnique({ where: { email: APPROVED_NGO_EMAIL }, include: { ngoProfile: true } });
  if (!ngoUser?.ngoProfile) {
    console.log('Approved test NGO not found yet — skipping activity seed (global-setup provisions it first).');
    return;
  }

  await seedNgoActivity(ngoUser.ngoProfile.id, donor.id);
  console.log('E2E fixtures ready: admin + donor accounts, seed drive/campaign/tree activity.');
}

main().finally(() => prisma.$disconnect());
