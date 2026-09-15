import { z } from 'zod';

export const upsertAddressSchema = z.object({
  label: z.string().max(60).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  landmark: z.string().max(200).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  // Required on create (this schema's own base shape) — delivery tracking (both the customer's
  // live map and the delivery partner's own) needs real coordinates, not just a text address.
  // The route's PATCH uses `.partial()` over this same schema, so editing an existing address
  // without touching lat/lng still works even if that address predates this requirement.
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

export const addCartItemSchema = z.object({
  stockId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const checkoutSchema = z
  .object({
    fulfillmentType: z.enum(['pickup', 'delivery']).default('delivery'),
    addressId: z.string().uuid().optional(),
    pickupWindowLabel: z.string().max(100).optional(),
    scheduledFor: z.string().datetime().optional(),
  })
  .refine((v) => v.fulfillmentType !== 'delivery' || !!v.addressId, {
    message: 'An address is required for delivery',
    path: ['addressId'],
  });

export const submitOrderReviewSchema = z.object({
  nurseryRating: z.coerce.number().int().min(1).max(5),
  deliveryRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export const addWishlistItemSchema = z
  .object({
    nurseryId: z.string().uuid().optional(),
    stockId: z.string().uuid().optional(),
  })
  .refine((v) => (v.nurseryId ? 1 : 0) + (v.stockId ? 1 : 0) === 1, {
    message: 'Provide exactly one of nurseryId or stockId',
  });
