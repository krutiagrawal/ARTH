import { z } from 'zod';

export const browseQuerySchema = z.object({
  q: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
