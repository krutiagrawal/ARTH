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
  isAnonymous: z.boolean().optional(),
  message: z.string().trim().max(300).optional(),
  // Indian PAN: 5 letters, 4 digits, 1 letter. Empty string = not provided.
  donorPan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const listCampaignsQuerySchema = z.object({
  ngoId: z.string().uuid().optional(),
});

export const ownedListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export const myDonationsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['succeeded', 'pending', 'failed', 'refunded']).optional(),
  period: z.enum(['30d', '6m', '1y']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
