import { z } from 'zod';

export const updateNurseryProfileSchema = z.object({
  nurseryName: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().max(500).optional(),
  coverPhotoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  contactPhone: z.string().max(30).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  offersDelivery: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  deliveryRadiusKm: z.coerce.number().int().min(0).max(200).optional(),
  followPolicy: z.enum(['open', 'approval']).optional(),
});

export const nurseryBrowseQuerySchema = z.object({
  q: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  deliveryOnly: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(20000).optional(),
});

export const respondToReviewSchema = z.object({
  response: z.string().min(1).max(1000),
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
  photoUrl: z.string().max(500).optional(),
});

export const updateSaplingStockSchema = z.object({
  species: z.string().min(1).max(120).optional(),
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isFree: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  photoUrl: z.string().max(500).optional(),
});
