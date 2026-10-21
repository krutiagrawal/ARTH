import { PrismaClient } from '@arth/db';
import { randomUUID } from 'node:crypto';
import { getStripeClient } from '../lib/stripe';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { confirmOrderPayment } from './order.service';
import { notify } from './notification.service';
import { sendEmail } from './email.service';

interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmountCents?: number;
  coverPhotoUrl?: string;
  category?: string;
  endsAt?: Date;
}

interface UpdateCampaignInput {
  title?: string;
  description?: string;
  goalAmountCents?: number | null;
  coverPhotoUrl?: string;
  category?: string | null;
  endsAt?: Date | null;
}

interface OwnedListFilter {
  q?: string;
  status?: 'active' | 'closed';
  category?: string;
  archived?: boolean;
  sort?: 'newest' | 'oldest' | 'ending_soon' | 'goal';
  page?: number;
  take?: number;
}

interface MyDonationsFilter {
  sort?: 'newest' | 'oldest' | 'amount';
  q?: string;
  status?: 'succeeded' | 'pending' | 'failed' | 'refunded';
  period?: '30d' | '6m' | '1y';
  page?: number;
  take?: number;
}

const PERIOD_DAYS = { '30d': 30, '6m': 182, '1y': 365 } as const;

const campaignInclude = {
  ngo: true,
  donations: {
    where: { status: 'succeeded' as const },
    orderBy: { createdAt: 'desc' as const },
    select: { amountCents: true, userId: true, isAnonymous: true, user: { select: { name: true } } },
  },
};

interface CampaignDonationRow {
  amountCents: number;
  userId: string;
  isAnonymous: boolean;
  user: { name: string };
}

const RECENT_DONOR_LIMIT = 3;

// Donations arrive newest-first (see campaignInclude), so the first-seen order of donors is
// already "most recent first". Only first names are exposed — this list is public — and donors
// who chose to be anonymous count toward donorCount but are never named.
function withRaisedAmount<T extends { donations: CampaignDonationRow[] }>(campaign: T) {
  const raisedAmountCents = campaign.donations.reduce((sum, d) => sum + d.amountCents, 0);
  const anonymousRaisedCents = campaign.donations.filter((d) => d.isAnonymous).reduce((sum, d) => sum + d.amountCents, 0);
  const donors = new Set<string>();
  const named = new Map<string, string>();
  for (const d of campaign.donations) {
    donors.add(d.userId);
    if (!d.isAnonymous && !named.has(d.userId)) named.set(d.userId, d.user.name.trim().split(/\s+/)[0] || 'Someone');
  }
  return {
    ...campaign,
    raisedAmountCents,
    anonymousRaisedCents,
    donorCount: donors.size,
    recentDonors: [...named.values()].slice(0, RECENT_DONOR_LIMIT),
  };
}

async function findOwnedCampaignOrThrow(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const campaign = await prisma.donationCampaign.findFirst({ where: { id: campaignId, ngoId: ngo.id } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
}

// Read-only sibling of findOwnedCampaignOrThrow — no approval check.
async function findOwnedCampaignReadOnly(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const campaign = await prisma.donationCampaign.findFirst({ where: { id: campaignId, ngoId: ngo.id } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
}

export async function createCampaign(prisma: PrismaClient, ngoUserId: string, input: CreateCampaignInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const campaign = await prisma.donationCampaign.create({
    data: { ngoId: ngo.id, ...input },
    include: campaignInclude,
  });
  return withRaisedAmount(campaign);
}

export async function updateCampaign(
  prisma: PrismaClient,
  ngoUserId: string,
  campaignId: string,
  input: UpdateCampaignInput,
) {
  const campaign = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  const updated = await prisma.donationCampaign.update({
    where: { id: campaign.id },
    data: input,
    include: campaignInclude,
  });
  return withRaisedAmount(updated);
}

export async function closeCampaign(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const campaign = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  const updated = await prisma.donationCampaign.update({
    where: { id: campaign.id },
    data: { status: 'closed' },
    include: campaignInclude,
  });
  return withRaisedAmount(updated);
}

export async function reopenCampaign(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const campaign = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  if (campaign.status !== 'closed') throw new ConflictError('Only a closed campaign can be reopened');
  const updated = await prisma.donationCampaign.update({
    where: { id: campaign.id },
    data: { status: 'active' },
    include: campaignInclude,
  });
  return withRaisedAmount(updated);
}

export async function listCampaigns(prisma: PrismaClient, filter: { ngoId?: string } = {}) {
  const campaigns = await prisma.donationCampaign.findMany({
    where: {
      status: 'active',
      ngo: { status: 'approved' },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      ...(filter.ngoId ? { ngoId: filter.ngoId } : {}),
    },
    include: campaignInclude,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return campaigns.map(withRaisedAmount);
}

export async function getCampaign(prisma: PrismaClient, campaignId: string) {
  const campaign = await prisma.donationCampaign.findUnique({ where: { id: campaignId }, include: campaignInclude });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return withRaisedAmount(campaign);
}

export async function listOwnedCampaigns(prisma: PrismaClient, ngoUserId: string, filter: OwnedListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const campaigns = await prisma.donationCampaign.findMany({
    where: {
      ngoId: ngo.id,
      ...(filter.q
        ? {
            OR: [
              { title: { contains: filter.q, mode: 'insensitive' as const } },
              { description: { contains: filter.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      archivedAt: filter.archived ? { not: null } : null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    },
    include: { ...campaignInclude, donations: { select: { amountCents: true, status: true, isAnonymous: true } } },
    orderBy:
      filter.sort === 'oldest'
        ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
        : filter.sort === 'ending_soon'
          ? [{ endsAt: { sort: 'asc' as const, nulls: 'last' as const } }, { id: 'desc' as const }]
          : filter.sort === 'goal'
            ? [{ goalAmountCents: { sort: 'desc' as const, nulls: 'last' as const } }, { id: 'desc' as const }]
            : [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take,
    skip: (page - 1) * take,
  });
  return campaigns.map((c) => ({
    ...c,
    raisedAmountCents: c.donations
      .filter((d) => d.status === 'succeeded')
      .reduce((sum, d) => sum + d.amountCents, 0),
    anonymousRaisedCents: c.donations
      .filter((d) => d.status === 'succeeded' && d.isAnonymous)
      .reduce((sum, d) => sum + d.amountCents, 0),
  }));
}

export async function listCampaignDonations(prisma: PrismaClient, ngoUserId: string, campaignId: string, filter: OwnedListFilter = {}) {
  const campaign = await findOwnedCampaignReadOnly(prisma, ngoUserId, campaignId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { campaignId: campaign.id, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: { id: true, amountCents: true, currency: true, createdAt: true, isAnonymous: true, message: true, user: { select: { name: true, handle: true } } },
    }),
    prisma.donation.count({ where: { campaignId: campaign.id, status: 'succeeded' } }),
  ]);

  return { donations, total };
}

export async function listMyDonations(prisma: PrismaClient, userId: string, filter: MyDonationsFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    userId,
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.period ? { createdAt: { gte: new Date(Date.now() - PERIOD_DAYS[filter.period] * 24 * 60 * 60 * 1000) } } : {}),
    ...(filter.q
      ? {
          OR: [
            { campaign: { title: { contains: filter.q, mode: 'insensitive' as const } } },
            { campaign: { ngo: { orgName: { contains: filter.q, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  // Lifetime totals ignore the search/filters: they're the "you've given" headline, and the
  // list below can then page through any slice without the totals jumping around.
  const settled = { userId, status: 'succeeded' as const };
  const [donations, total, sum, settledCount, ngoRows, anyCount] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy:
        filter.sort === 'oldest'
          ? [{ createdAt: 'asc' }, { id: 'asc' }]
          : filter.sort === 'amount'
            ? [{ amountCents: 'desc' }, { id: 'desc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      skip: (page - 1) * take,
      include: { campaign: { include: { ngo: true } } },
    }),
    prisma.donation.count({ where }),
    prisma.donation.aggregate({ where: settled, _sum: { amountCents: true } }),
    prisma.donation.count({ where: settled }),
    prisma.donation.findMany({ where: settled, distinct: ['campaignId'], select: { campaign: { select: { ngoId: true } } } }),
    prisma.donation.count({ where: { userId } }),
  ]);

  const summary = {
    totalCents: sum._sum.amountCents ?? 0,
    count: settledCount,
    ngos: new Set(ngoRows.map((r) => r.campaign.ngoId)).size,
    /** Donations of any status — lets the client tell "no donations yet" from "no matches". */
    allCount: anyCount,
  };

  return { donations, total, summary };
}

export async function createDonationIntent(
  prisma: PrismaClient,
  userId: string,
  campaignId: string,
  amountCents: number,
  currency = 'inr',
  extras: { isAnonymous?: boolean; message?: string; donorPan?: string } = {},
) {
  const campaign = await prisma.donationCampaign.findUnique({ where: { id: campaignId }, include: { ngo: true } });
  if (!campaign || campaign.status !== 'active' || campaign.ngo.status !== 'approved') {
    throw new NotFoundError('Campaign not found');
  }
  if (campaign.endsAt && campaign.endsAt.getTime() <= Date.now()) {
    throw new ConflictError('This campaign has ended');
  }
  if (campaign.ngo.userId === userId) throw new ForbiddenError('You cannot donate to your own campaign');

  // A donation can't push the total past the NGO's goal. Only settled donations count, matching
  // the raised total shown to donors. Campaigns without a goal have no cap.
  if (campaign.goalAmountCents != null) {
    const { _sum } = await prisma.donation.aggregate({
      where: { campaignId, status: 'succeeded' },
      _sum: { amountCents: true },
    });
    const remainingCents = campaign.goalAmountCents - (_sum.amountCents ?? 0);
    if (remainingCents <= 0) throw new ConflictError('This campaign has already reached its goal');
    if (amountCents > remainingCents) {
      throw new BadRequestError(`This campaign only needs ${formatRupees(remainingCents, currency)} more. Please enter that amount or less.`);
    }
  }

  // getStripeClient() throws ServiceUnavailableError when STRIPE_SECRET_KEY isn't configured —
  // in a local/dev environment without Stripe set up, that's not a hard stop: skip creating a
  // real PaymentIntent and record the donation as already succeeded instead of returning a
  // clientSecret for the client to present a payment form for. Mirrors the same bypass in
  // order.service.ts's checkout(). A real deployment always has STRIPE_SECRET_KEY set, so this
  // path never triggers there.
  let stripe: ReturnType<typeof getStripeClient> | null = null;
  try {
    stripe = getStripeClient();
  } catch (e) {
    if (!(e instanceof ServiceUnavailableError)) throw e;
  }

  const paymentIntent = stripe
    ? await stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        metadata: { campaignId, userId },
      })
    : null;

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      userId,
      amountCents,
      currency,
      isAnonymous: extras.isAnonymous ?? false,
      message: extras.message || null,
      donorPan: extras.donorPan || null,
      stripePaymentIntentId: paymentIntent?.id,
      status: paymentIntent ? 'pending' : 'succeeded',
    },
  });

  if (!paymentIntent) {
    await finalizeSucceededDonation(prisma, donation.id);
  }

  return { donation, clientSecret: paymentIntent?.client_secret ?? null };
}

// Shared by the real Stripe-webhook path (handleStripeWebhookEvent) and the dev/test-mode
// bypass in createDonationIntent above — everything that has to happen once a donation's
// payment is settled (receipt number + email, NGO notification), regardless of which path
// got it there.
async function finalizeSucceededDonation(prisma: PrismaClient, donationId: string) {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { campaign: { include: { ngo: true } }, user: { select: { name: true } } },
  });
  if (!donation) return;

  if (!donation.receiptNumber) {
    await prisma.donation.update({ where: { id: donation.id }, data: { receiptNumber: generateReceiptNumber() } });
    await sendDonationReceiptEmail(prisma, donation.id);
  }

  await notify(prisma, {
    userId: donation.campaign.ngo.userId,
    type: 'ngo_donation_received',
    actorUserId: donation.userId,
    data: { campaignId: donation.campaignId, campaignTitle: donation.campaign.title, amountCents: donation.amountCents, message: donation.message },
    push: {
      title: donation.campaign.ngo.orgName,
      body: `${donation.user.name} donated ₹${(donation.amountCents / 100).toLocaleString('en-IN')} to ${donation.campaign.title}`,
    },
  });
}

// ARTH-<year>-<8 uppercase hex chars> — stable once assigned (see Donation.receiptNumber),
// never reused even if a donation is later refunded.
function generateReceiptNumber(): string {
  return `ARTH-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatRupees(amountCents: number, currency: string): string {
  const amount = (amountCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  return `${currency.toUpperCase() === 'INR' ? '₹' : currency.toUpperCase() + ' '}${amount}`;
}

/** Plain-HTML receipt — no PDF library in this codebase, and none of this app's other transactional
 * documents (order confirmations, planting guides) use one either (see order.service.ts's
 * sendEmail calls). Printable to PDF from any browser; served both by email and on-demand. */
function buildReceiptHtml(donation: {
  receiptNumber: string;
  amountCents: number;
  currency: string;
  createdAt: Date;
  donorName: string;
  donorPan: string | null;
  campaignTitle: string;
  ngoOrgName: string;
  ngoEightyG: string | null;
  ngoPan: string | null;
}): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #ddd; color: #2d2a25;">
      <h1 style="font-size: 20px; margin: 0 0 4px;">Donation Receipt</h1>
      <p style="font-size: 13px; color: #6e6355; margin: 0 0 24px;">Receipt No. ${donation.receiptNumber}</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6e6355;">Date</td><td style="padding: 6px 0; text-align: right;">${donation.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td style="padding: 6px 0; color: #6e6355;">Donor</td><td style="padding: 6px 0; text-align: right;">${donation.donorName}</td></tr>
        ${donation.donorPan ? `<tr><td style="padding: 6px 0; color: #6e6355;">Donor PAN</td><td style="padding: 6px 0; text-align: right;">${donation.donorPan}</td></tr>` : ''}
        <tr><td style="padding: 6px 0; color: #6e6355;">Received by</td><td style="padding: 6px 0; text-align: right;">${donation.ngoOrgName}</td></tr>
        <tr><td style="padding: 6px 0; color: #6e6355;">Campaign</td><td style="padding: 6px 0; text-align: right;">${donation.campaignTitle}</td></tr>
        <tr><td style="padding: 12px 0 6px; font-weight: bold; border-top: 1px solid #ddd;">Amount</td><td style="padding: 12px 0 6px; text-align: right; font-weight: bold; border-top: 1px solid #ddd;">${formatRupees(donation.amountCents, donation.currency)}</td></tr>
      </table>
      ${
        donation.ngoEightyG || donation.ngoPan
          ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #6e6355;">
              ${donation.ngoEightyG ? `<p style="margin: 0 0 4px;">80G Registration No.: ${donation.ngoEightyG}</p>` : ''}
              ${donation.ngoPan ? `<p style="margin: 0;">PAN: ${donation.ngoPan}</p>` : ''}
            </div>`
          : ''
      }
      <p style="margin-top: 24px; font-size: 12px; color: #6e6355;">This receipt confirms a donation made via ARTH. Retain for your tax records.</p>
    </div>
  `;
}

async function loadDonationForReceipt(prisma: PrismaClient, donationId: string) {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { campaign: { include: { ngo: true } }, user: { select: { id: true, name: true } } },
  });
  if (!donation || donation.status !== 'succeeded' || !donation.receiptNumber) {
    throw new NotFoundError('Receipt not found');
  }
  return donation;
}

async function sendDonationReceiptEmail(prisma: PrismaClient, donationId: string) {
  try {
    const donation = await loadDonationForReceipt(prisma, donationId);
    const donorEmail = await prisma.user.findUnique({ where: { id: donation.userId }, select: { email: true } });
    if (!donorEmail?.email) return;

    const html = buildReceiptHtml({
      receiptNumber: donation.receiptNumber!,
      amountCents: donation.amountCents,
      currency: donation.currency,
      createdAt: donation.createdAt,
      donorName: donation.user.name,
      donorPan: donation.donorPan,
      campaignTitle: donation.campaign.title,
      ngoOrgName: donation.campaign.ngo.orgName,
      ngoEightyG: donation.campaign.ngo.eightyGRegistrationNumber,
      ngoPan: donation.campaign.ngo.panNumber,
    });

    await sendEmail({
      to: donorEmail.email,
      subject: `Your donation receipt from ${donation.campaign.ngo.orgName}`,
      html,
    });
  } catch (error) {
    console.warn('[donation] could not send receipt email:', error);
  }
}

/** Renders the same receipt on demand — accessible to the donor or the NGO that received the
 * donation, so either side can view/print it without waiting on the original email. */
export async function getDonationReceiptHtml(prisma: PrismaClient, requestingUserId: string, donationId: string) {
  const donation = await loadDonationForReceipt(prisma, donationId);
  const isDonor = donation.userId === requestingUserId;
  const isReceivingNgo = donation.campaign.ngo.userId === requestingUserId;
  if (!isDonor && !isReceivingNgo) throw new ForbiddenError('You cannot view this receipt');

  return buildReceiptHtml({
    receiptNumber: donation.receiptNumber!,
    amountCents: donation.amountCents,
    currency: donation.currency,
    createdAt: donation.createdAt,
    donorName: donation.user.name,
    donorPan: donation.donorPan,
    campaignTitle: donation.campaign.title,
    ngoOrgName: donation.campaign.ngo.orgName,
    ngoEightyG: donation.campaign.ngo.eightyGRegistrationNumber,
    ngoPan: donation.campaign.ngo.panNumber,
  });
}

export async function handleStripeWebhookEvent(
  prisma: PrismaClient,
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
) {
  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as { id: string };
    const status = event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed';
    // A payment intent id is either a campaign donation or a plant sponsorship,
    // never both — the other updateMany is just a harmless no-op match.
    await prisma.donation.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status },
    });
    await prisma.drivePlantSponsorship.updateMany({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status },
    });
    // A no-op unless this payment intent belongs to a marketplace order (confirmOrderPayment
    // looks it up by id and returns early if there's no matching, still-pending order).
    await confirmOrderPayment(prisma, paymentIntent.id, status === 'succeeded');

    if (status === 'succeeded') {
      const donation = await prisma.donation.findFirst({ where: { stripePaymentIntentId: paymentIntent.id } });
      if (donation) {
        await finalizeSucceededDonation(prisma, donation.id);
      }
    }
  }
}

/**
 * Permanently removes a campaign created by mistake or for testing. Blocked as soon as it has any
 * donation that went through (donors hold receipts); a campaign with only abandoned/failed
 * attempts can go. Otherwise it should just be closed.
 */
export async function deleteCampaign(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const campaign = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  const paid = await prisma.donation.count({ where: { campaignId: campaign.id, status: { in: ['succeeded', 'refunded'] } } });
  if (paid > 0) throw new ConflictError('This campaign has received donations – close it instead of deleting it.');
  await prisma.donationCampaign.delete({ where: { id: campaign.id } });
  return { id: campaign.id };
}

export async function getOwnedCampaignSummary(prisma: PrismaClient, ngoUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const now = new Date();
  const base = { ngoId: ngo.id, archivedAt: null };
  const [total, active, closed, archived, endingSoon] = await Promise.all([
    prisma.donationCampaign.count({ where: base }),
    prisma.donationCampaign.count({ where: { ...base, status: 'active' } }),
    prisma.donationCampaign.count({ where: { ...base, status: 'closed' } }),
    prisma.donationCampaign.count({ where: { ngoId: ngo.id, archivedAt: { not: null } } }),
    prisma.donationCampaign.count({ where: { ...base, status: 'active', endsAt: { gt: now, lte: new Date(now.getTime() + 3 * 86_400_000) } } }),
  ]);
  return { total, active, closed, archived, needsAttention: endingSoon };
}

/** Clones a campaign as a fresh active one with no donations; a timed campaign keeps its original length, counted from now. */
export async function duplicateCampaign(prisma: PrismaClient, ngoUserId: string, campaignId: string) {
  const source = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  const length = source.endsAt ? source.endsAt.getTime() - source.createdAt.getTime() : null;
  const created = await prisma.donationCampaign.create({
    data: {
      ngoId: source.ngoId,
      title: `${source.title} (copy)`.slice(0, 120),
      description: source.description,
      goalAmountCents: source.goalAmountCents,
      coverPhotoUrl: source.coverPhotoUrl,
      category: source.category,
      endsAt: length && length > 0 ? new Date(Date.now() + length) : null,
    },
    include: campaignInclude,
  });
  return withRaisedAmount(created);
}

/** Only a closed campaign can be archived – an active one is still collecting donations. */
export async function setCampaignArchived(prisma: PrismaClient, ngoUserId: string, campaignId: string, archived: boolean) {
  const campaign = await findOwnedCampaignOrThrow(prisma, ngoUserId, campaignId);
  if (archived && campaign.status === 'active') throw new ConflictError('Close this campaign before archiving it.');
  const updated = await prisma.donationCampaign.update({
    where: { id: campaign.id },
    data: { archivedAt: archived ? new Date() : null },
    include: campaignInclude,
  });
  return withRaisedAmount(updated);
}

export async function exportOwnedCampaigns(prisma: PrismaClient, ngoUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const campaigns = await prisma.donationCampaign.findMany({
    where: { ngoId: ngo.id },
    orderBy: { createdAt: 'desc' },
    include: { donations: { select: { amountCents: true, status: true, userId: true } } },
  });
  return campaigns.map((c) => {
    const paid = c.donations.filter((d) => d.status === 'succeeded');
    return {
      title: c.title,
      status: c.archivedAt ? `${c.status} (archived)` : c.status,
      category: c.category ?? '',
      goalRupees: c.goalAmountCents != null ? c.goalAmountCents / 100 : '',
      raisedRupees: paid.reduce((sum, d) => sum + d.amountCents, 0) / 100,
      donors: new Set(paid.map((d) => d.userId)).size,
      createdAt: c.createdAt.toISOString(),
      endsAt: c.endsAt ? c.endsAt.toISOString() : '',
    };
  });
}

export async function exportMyDonations(prisma: PrismaClient, userId: string) {
  const donations = await prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { campaign: { include: { ngo: { select: { orgName: true } } } } },
  });
  return donations.map((d) => ({
    date: d.createdAt.toISOString(),
    campaign: d.campaign.title,
    ngo: d.campaign.ngo?.orgName ?? '',
    amountRupees: d.amountCents / 100,
    status: d.status,
    receiptNumber: d.receiptNumber ?? '',
  }));
}
