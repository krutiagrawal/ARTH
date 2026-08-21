import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(30).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.string().min(1).max(120).optional(),
  contactEmail: z.union([z.string().email().max(200), z.literal('')]).optional(),
  contactPhone: z.string().max(30).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});
