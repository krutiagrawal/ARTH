import { PrismaClient } from '@plant/db';
import { getStripeClient } from '../lib/stripe';
import { ConflictError, NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';

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

export async function listCampaigns(prisma: PrismaClient) {
  const campaigns = await prisma.donationCampaign.findMany({
    where: { status: 'active', ngo: { status: 'approved' } },
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

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata: { campaignId, userId },
  });

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      userId,
      amountCents,
      currency,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    },
  });

  return { donation, clientSecret: paymentIntent.client_secret };
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
  }
}
