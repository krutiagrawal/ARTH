import { z } from 'zod';

export const createBulkRequirementSchema = z.object({
  driveId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  speciesNote: z.string().max(200).optional(),
  nativePreferred: z.boolean().optional(),
  quantityNeeded: z.coerce.number().int().min(1).max(1_000_000),
  neededByDate: z.string().datetime().optional(),
  city: z.string().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
});

export const respondToBulkRequirementSchema = z.object({
  quantityOffered: z.coerce.number().int().min(1).max(1_000_000),
  priceCents: z.coerce.number().int().min(0).optional(),
  canDeliver: z.boolean().optional(),
  canPickup: z.boolean().optional(),
  message: z.string().max(500).optional(),
});
