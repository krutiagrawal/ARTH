import { z } from 'zod';

// Multipart form fields arrive as strings even when the value is logically an array/object
// (operatingHours, pickupWindows, suitableEnvironments, plantingSeasons) — JSON-encoded
// client-side. A JSON body (no photo) already sends real arrays, so this passes those through
// untouched and only parses when the value is a string. Mirrors ngo.schema.ts's jsonValue.
function jsonValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);
}

// A handful of labeled slots, not a recurring-calendar scheduling system — matches the
// NurseryProfile.operatingHours/pickupWindows schema comment.
const operatingHoursEntrySchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  opensAt: z.string().max(10),
  closesAt: z.string().max(10),
});

const pickupWindowEntrySchema = z.object({
  label: z.string().min(1).max(60),
  startTime: z.string().max(10),
  endTime: z.string().max(10),
});

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
  // Pickup/delivery configuration (section 4) — delivery must remain optional, so the service
  // layer rejects a combination that leaves both offersPickup and offersDelivery false.
  offersPickup: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  deliveryFeeCents: z.coerce.number().int().min(0).optional(),
  minDeliveryOrderCents: z.coerce.number().int().min(0).optional(),
  operatingHours: jsonValue(z.array(operatingHoursEntrySchema).max(14)).optional(),
  pickupWindows: jsonValue(z.array(pickupWindowEntrySchema).max(10)).optional(),
  pickupInstructions: z.string().max(1000).optional(),
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

// Inline species-authoring payload (decision 6 / D4): a nursery can either link an existing
// TreeSpecies by id, or author/upgrade a curated botanical record in the same request that
// creates the stock listing — no separate "manage the species catalog first" workflow. At most
// one of speciesId/species should be sent; nursery.service.ts's resolveSpeciesLink resolves it.
const inlineSpeciesSchema = z.object({
  commonName: z.string().min(1).max(120),
  scientificName: z.string().max(160).optional(),
  localName: z.string().max(120).optional(),
  emoji: z.string().max(8).optional(),
  isNative: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === 'true')),
  sunlightNeeds: z.enum(['full_sun', 'partial_shade', 'shade']).optional(),
  waterNeeds: z.enum(['low', 'medium', 'high']).optional(),
  soilNeeds: z.string().max(300).optional(),
  matureHeightLabel: z.string().max(60).optional(),
  plantingSeasons: z.array(z.string().max(40)).max(12).optional(),
  co2KgPerYear: z.coerce.number().min(0).max(1000).optional(),
  description: z.string().max(1000).optional(),
});

const stockDetailFields = {
  speciesId: z.string().uuid().optional(),
  species: jsonValue(inlineSpeciesSchema).optional(),
  ageLabel: z.string().max(60).optional(),
  heightLabel: z.string().max(60).optional(),
  potSize: z.string().max(60).optional(),
  suitableEnvironments: jsonValue(z.array(z.string().max(60)).max(12)).optional(),
  nurseryNotes: z.string().max(1000).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).optional(),
};

export const createSaplingStockSchema = z
  .object({
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    isFree: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
    priceCents: z.coerce.number().int().min(0).optional(),
    photoUrl: z.string().max(500).optional(),
    ...stockDetailFields,
  })
  .refine((v) => !!v.speciesId || !!v.species, { message: 'Provide either speciesId or species details', path: ['species'] });

export const updateSaplingStockSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isFree: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  photoUrl: z.string().max(500).optional(),
  ...stockDetailFields,
});
