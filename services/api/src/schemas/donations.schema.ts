import { z } from 'zod';

export const CAMPAIGN_CATEGORIES = ['planting', 'restoration', 'awareness', 'wildlife', 'community', 'other'] as const;

const futureDate = z.coerce.date().refine((d) => d.getTime() > Date.now(), 'End date must be in the future');

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  goalAmountCents: z.coerce.number().int().min(1).optional(),
  category: z.enum(CAMPAIGN_CATEGORIES).optional(),
  endsAt: futureDate.optional(),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  goalAmountCents: z.union([z.coerce.number().int().min(1), z.null()]).optional(),
  category: z.union([z.enum(CAMPAIGN_CATEGORIES), z.null()]).optional(),
  endsAt: z.union([futureDate, z.null()]).optional(),
});

export const createDonationSchema = z.object({
  amountCents: z.coerce.number().int().min(100).max(1_000_000_00),
  currency: z.string().length(3).optional(),
});

export const listCampaignsQuerySchema = z.object({
  ngoId: z.string().uuid().optional(),
});

export const ownedListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
