import { z } from 'zod';

export const upsertAddressSchema = z.object({
  label: z.string().max(60).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  landmark: z.string().max(200).optional(),
  pincode: z.string().min(4).max(12),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

export const addCartItemSchema = z.object({
  stockId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const checkoutSchema = z.object({
  addressId: z.string().uuid(),
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
