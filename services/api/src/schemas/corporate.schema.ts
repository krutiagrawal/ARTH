import { z } from 'zod';

export const updateCorporateProfileSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  industry: z.string().max(120).optional(),
});

export const createSponsorshipSchema = z.object({
  driveId: z.string().uuid().optional(),
  amountCents: z.coerce.number().int().min(1),
  note: z.string().max(500).optional(),
});
