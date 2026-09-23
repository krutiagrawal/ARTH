import { PrismaClient } from '@plant/db';
import { randomUUID } from 'node:crypto';
import { getStripeClient } from '../lib/stripe';
import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { confirmOrderPayment } from './order.service';
import { notify } from './notification.service';
import { sendEmail } from './email.service';

interface CreateCampaignInput {
  title: string;
  description: string;
  goalAmountCents?: number;
  coverPhotoUrl?: string;
}

interface UpdateCampaignInput {
  title?: string;
  description?: string;
  goalAmountCents?: number | null;
  coverPhotoUrl?: string;
}

interface OwnedListFilter {
  q?: string;
  page?: number;
  take?: number;
}

interface MyDonationsFilter {
  page?: number;
  take?: number;
}

const campaignInclude = {
  ngo: true,
  donations: { where: { status: 'succeeded' as const }, select: { amountCents: true } },
};

function withRaisedAmount<T extends { donations: { amountCents: number }[] }>(campaign: T) {
  const raisedAmountCents = campaign.donations.reduce((sum, d) => sum + d.amountCents, 0);
  return { ...campaign, raisedAmountCents };
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
    where: { status: 'active', ngo: { status: 'approved' }, ...(filter.ngoId ? { ngoId: filter.ngoId } : {}) },
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
      ...(filter.q ? { title: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    },
    include: { ...campaignInclude, donations: { select: { amountCents: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
  return campaigns.map((c) => ({
    ...c,
    raisedAmountCents: c.donations
      .filter((d) => d.status === 'succeeded')
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
      select: { id: true, amountCents: true, currency: true, createdAt: true, user: { select: { name: true, handle: true } } },
    }),
    prisma.donation.count({ where: { campaignId: campaign.id, status: 'succeeded' } }),
  ]);

  return { donations, total };
}

export async function listMyDonations(prisma: PrismaClient, userId: string, filter: MyDonationsFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: { campaign: { include: { ngo: true } } },
    }),
    prisma.donation.count({ where: { userId } }),
  ]);

  return { donations, total };
}

export async function createDonationIntent(
  prisma: PrismaClient,
  userId: string,
  campaignId: string,
  amountCents: number,
  currency = 'inr',
) {
  const campaign = await prisma.donationCampaign.findUnique({ where: { id: campaignId }, include: { ngo: true } });
  if (!campaign || campaign.status !== 'active' || campaign.ngo.status !== 'approved') {
    throw new NotFoundError('Campaign not found');
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
    data: { campaignId: donation.campaignId, campaignTitle: donation.campaign.title, amountCents: donation.amountCents },
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
