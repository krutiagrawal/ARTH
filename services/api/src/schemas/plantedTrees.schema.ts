import { z } from 'zod';

export const bulkCreatePlantedTreesSchema = z.object({
  driveId: z.string().uuid().optional(),
  speciesName: z.string().min(1).max(100),
  count: z.coerce.number().int().min(1).max(1000),
  locationLabel: z.string().max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const listQuerySchema = z.object({
  driveId: z.string().uuid().optional(),
  speciesName: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

const healthStatusEnum = z.enum(['healthy', 'struggling', 'dead', 'removed']);

export const singleHealthCheckSchema = z.object({
  status: healthStatusEnum,
  notes: z.string().max(1000).optional(),
});

export const bulkHealthCheckSchema = z.object({
  plantedTreeIds: z.array(z.string().uuid()).min(1).max(500),
  status: healthStatusEnum,
  notes: z.string().max(1000).optional(),
});

export const survivalStatsQuerySchema = z.object({
  driveId: z.string().uuid().optional(),
});
