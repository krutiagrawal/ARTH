import { z } from 'zod';

const healthStatusEnum = z.enum(['healthy', 'struggling', 'dead', 'removed']);

export const bulkCreatePlantedTreesSchema = z.object({
  driveId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  speciesName: z.string().min(1).max(100),
  // Capped well below the growth-level tier thresholds (see ngoReputation.service.ts) so a
  // single self-reported batch — even with a photo — can't alone vault an NGO into a higher
  // tier; a real large planting gets logged (and photographed) across several batches.
  count: z.coerce.number().int().min(1).max(200),
  locationLabel: z.string().max(300).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const listQuerySchema = z.object({
  driveId: z.string().uuid().optional(),
  // 'unzoned' is a sentinel meaning "only trees with no zone" — a route-level concern since it
  // isn't a real zone id, translated to a literal `null` filter before hitting the service.
  zoneId: z.union([z.string().uuid(), z.literal('unzoned')]).optional(),
  speciesName: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export const createZoneSchema = z.object({
  driveId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const renameZoneSchema = z.object({
  name: z.string().min(1).max(100),
});

export const listZonesQuerySchema = z.object({
  driveId: z.string().uuid(),
});

export const zoneBulkHealthCheckSchema = z.object({
  status: healthStatusEnum,
  notes: z.string().max(1000).optional(),
});

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
