import { z } from 'zod';

export const createAdoptableTreeSchema = z.object({
  nickname: z.string().min(1).max(60),
  speciesName: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  instructions: z.string().max(2000).optional(),
  city: z.string().min(1).max(100),
  locationLabel: z.string().max(200).optional(),
});

export const updateAdoptableTreeSchema = z.object({
  nickname: z.string().min(1).max(60).optional(),
  speciesName: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  instructions: z.string().max(2000).optional(),
  city: z.string().min(1).max(100).optional(),
  locationLabel: z.string().max(200).optional(),
});

export const adoptSchema = z.object({
  message: z.string().max(500).optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(20000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const ownedListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export const releaseAdoptionSchema = z.object({
  reason: z.string().max(500).optional(),
});
