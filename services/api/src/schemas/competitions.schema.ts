import { z } from 'zod';

export const createEntrySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
});
