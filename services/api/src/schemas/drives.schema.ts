import { z } from 'zod';

// Multipart form fields arrive as strings even when the value is logically an
// array (pickupPoints/plants) — JSON-encoded client-side. A JSON body (PATCH
// without a photo) already sends real arrays, so this passes those through
// untouched and only parses when the value is a string. Takes the fully-built
// array schema (with .max() etc. already applied) so chaining still works.
function jsonArray<T extends z.ZodTypeAny>(arraySchema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, arraySchema);
}

const pickupPointSchema = z.object({
  address: z.string().min(1).max(300),
  arrivalBy: z.coerce.date(),
  order: z.number().int().min(0).optional(),
});

const drivePlantSchema = z.object({
  speciesName: z.string().min(1).max(100),
  priceCents: z.coerce.number().int().min(1).max(10_000_000),
});

export const createDriveSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    instructions: z.string().max(2000).optional(),
    address: z.string().min(1).max(300),
    city: z.string().min(1).max(100),
    transportMode: z.enum(['self_arrange', 'ngo_provided']).optional().default('self_arrange'),
    pickupPoints: jsonArray(z.array(pickupPointSchema).max(20)).optional(),
    plants: jsonArray(z.array(drivePlantSchema).max(50)).optional(),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    capacity: z.coerce.number().int().min(1).max(100000).optional(),
  })
  .refine((data) => data.transportMode !== 'ngo_provided' || (data.pickupPoints && data.pickupPoints.length > 0), {
    message: 'Add at least one pickup point, or switch to "users make their own way"',
    path: ['pickupPoints'],
  });

export const updateDriveSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  instructions: z.string().max(2000).optional(),
  address: z.string().min(1).max(300).optional(),
  city: z.string().min(1).max(100).optional(),
  transportMode: z.enum(['self_arrange', 'ngo_provided']).optional(),
  pickupPoints: jsonArray(z.array(pickupPointSchema).max(20)).optional(),
  plants: jsonArray(z.array(drivePlantSchema).max(50)).optional(),
  startsAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  capacity: z.union([z.coerce.number().int().min(1).max(100000), z.null()]).optional(),
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

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});
