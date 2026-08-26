import { z } from 'zod';

// Multipart form fields arrive as strings even when the value is logically an
// array/object (awards) — JSON-encoded client-side. A JSON body (no photo)
// already sends real arrays, so this passes those through untouched and only
// parses when the value is a string.
function jsonValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);
}

const awardSchema = z.object({
  title: z.string().min(1).max(200),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  issuer: z.string().max(200).optional(),
});

export const updateProfileSchema = z.object({
  orgName: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  website: z.string().url().max(300).optional(),
  contactPhone: z.string().max(30).optional(),
  logoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  foundedYear: z.coerce.number().int().min(1800).max(2200).optional(),
  volunteerCountEstimate: z.coerce.number().int().min(0).max(1_000_000).optional(),
  awards: jsonValue(z.array(awardSchema).max(50)).optional(),
  // 'open' accepts followers instantly; 'approval' routes each one to the request inbox.
  followPolicy: z.enum(['open', 'approval']).optional(),
});

export const donationsQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});
