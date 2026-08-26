import { z } from 'zod';

export const updateNurseryProfileSchema = z.object({
  nurseryName: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  contactPhone: z.string().max(30).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const createReservationSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100_000),
  message: z.string().max(500).optional(),
});

export const createSaplingStockSchema = z.object({
  species: z.string().min(1).max(120),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  isFree: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
});

export const updateSaplingStockSchema = z.object({
  species: z.string().min(1).max(120).optional(),
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isFree: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
});
