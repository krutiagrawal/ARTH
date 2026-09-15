import { z } from 'zod';
import { websiteUrlSchema } from '../utils/websiteUrl';
import { phoneSchema } from '../utils/phone';

const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores');

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  deviceInfo: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceInfo: z.string().max(200).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});

export const registerNgoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  orgName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  website: websiteUrlSchema.optional(),
  contactPhone: phoneSchema.optional(),
  deviceInfo: z.string().max(200).optional(),
});

export const registerGroupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  groupName: z.string().min(1).max(120),
  groupType: z.enum(['family', 'school', 'club', 'other']).default('other'),
  description: z.string().min(1).max(2000),
  deviceInfo: z.string().max(200).optional(),
});

// Kept in sync with the NurseryType enum in packages/db/prisma/schema.prisma.
export const NURSERY_TYPES = [
  'retail',
  'wholesale',
  'native_plant',
  'government',
  'ngo_community',
  'landscaping',
  'other',
] as const;

const boolFromString = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === true || v === 'true'));

export const registerNurserySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  nurseryName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  city: z.string().max(120).optional(),
  contactPhone: phoneSchema.optional(),
  line1: z.string().max(300).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  yearEstablished: z.coerce.number().int().min(1800).max(2100).optional(),
  // Required in the mobile signup wizard's own step validation; kept optional at the schema level
  // so the older web registration form (apps/web/app/nursery/register, no wizard/photo yet) keeps
  // working unchanged.
  nurseryType: z.enum(NURSERY_TYPES).optional(),
  websiteUrl: websiteUrlSchema.optional(),
  responsiblePersonName: z.string().max(120).optional(),
  responsiblePersonRole: z.string().max(60).optional(),
  responsiblePersonPhone: phoneSchema.optional(),
  // Sent as a comma-joined string over multipart (no repeated-field-name convention elsewhere in
  // this codebase's form uploads), split back into an array here.
  plantCategories: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((c) => c.trim()).filter(Boolean) : undefined)),
  approxPlantCount: z.string().max(60).optional(),
  seasonalAvailability: boolFromString,
  bulkSupply: boolFromString,
  gstin: z.string().max(30).optional(),
  businessRegistrationNumber: z.string().max(60).optional(),
  tradeLicenseNumber: z.string().max(60).optional(),
  ngoRegistrationNumber: z.string().max(60).optional(),
  governmentNurseryId: z.string().max(60).optional(),
  deviceInfo: z.string().max(200).optional(),
});

export const registerCorporateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  companyName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  industry: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  deviceInfo: z.string().max(200).optional(),
});

// Used by GET /api/auth/check-availability — every form that collects an email/phone/handle can
// ask "is this taken?" as the user types, instead of only finding out on submit. At least one
// field must be present; validated the same way each register* schema validates its own copy.
export const checkAvailabilitySchema = z
  .object({
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    handle: handleSchema.optional(),
  })
  .refine((v) => v.email || v.phone || v.handle, { message: 'Provide at least one of email, phone, or handle' });
