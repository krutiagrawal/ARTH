import { z } from 'zod';

export const createUpdateSchema = z.object({
  caption: z.string().max(1000).optional(),
  driveId: z.string().uuid().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
