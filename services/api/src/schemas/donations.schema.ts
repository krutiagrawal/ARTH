import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  goalAmountCents: z.coerce.number().int().min(1).optional(),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  goalAmountCents: z.union([z.coerce.number().int().min(1), z.null()]).optional(),
});

export const createDonationSchema = z.object({
  amountCents: z.coerce.number().int().min(100).max(1_000_000_00),
  currency: z.string().length(3).optional(),
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
