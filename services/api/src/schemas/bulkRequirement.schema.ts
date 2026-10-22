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

// Every field optional (send only what changed); `null` clears an optional field.
export const updateBulkRequirementSchema = z.object({
  speciesId: z.string().uuid().nullable().optional(),
  speciesNote: z.string().max(200).nullable().optional(),
  nativePreferred: z.boolean().optional(),
  quantityNeeded: z.coerce.number().int().min(1).max(1_000_000).optional(),
  neededByDate: z.string().datetime().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const respondToBulkRequirementSchema = z.object({
  quantityOffered: z.coerce.number().int().min(1).max(1_000_000),
  priceCents: z.coerce.number().int().min(0).optional(),
  canDeliver: z.boolean().optional(),
  canPickup: z.boolean().optional(),
  message: z.string().max(500).optional(),
});

export const confirmBulkRequirementResponseSchema = z.object({
  code: z.string().min(1).max(20),
});

export const rescheduleBulkRequirementSchema = z.object({
  neededByDate: z.string().datetime(),
});
