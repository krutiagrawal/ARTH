import { z } from 'zod';
import { phoneSchema } from '../utils/phone';

// Same handle regex as auth.schema.ts's registerNurserySchema — kept in sync manually since
// there's no shared handle-validator module.
const handleSchema = z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Handle can only contain lowercase letters, numbers, and underscores');

export const createDeliveryPartnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(80),
  handle: handleSchema,
  phone: phoneSchema,
  photoUrl: z.string().max(500).optional(),
});

export const updateDeliveryPartnerSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: phoneSchema.optional(),
  photoUrl: z.string().max(500).optional(),
  isActive: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

export const dispatchOrderSchema = z.object({
  deliveryPartnerId: z.string().uuid(),
});

export const reportLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const deliverWithCodeSchema = z.object({
  code: z.string().min(4).max(8),
});
