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

// Multipart form fields arrive as strings even when the value is logically an array/object
// (officeBearers, and every link-array field below) — JSON-encoded client-side. A JSON body
// already sends real arrays, so this passes those through untouched and only parses when the
// value is a string. Mirrors ngo.schema.ts's/nursery.schema.ts's jsonValue.
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

// Enum-value multi-selects (city/state names, work areas, ARTH usage goals, participant types) —
// arrive as a comma-joined string over multipart (safe: none of these values can themselves
// contain a comma, unlike the URL fields below which use jsonValue instead) or as a real array
// over a plain JSON body (e.g. the profile-update route, which isn't always multipart).
export function commaList(max = 20) {
  return z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const arr = Array.isArray(v) ? v : v.split(',');
      return arr.map((c) => c.trim()).filter(Boolean).slice(0, max);
    });
}

export const boolFromString = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === true || v === 'true'));

// Kept in sync with the NgoOrgType/etc. enums and TS const arrays in packages/db/prisma/schema.prisma.
export const NGO_ORG_TYPES = ['trust', 'society', 'section8_company', 'registered_nonprofit', 'other'] as const;

export const NGO_WORK_AREAS = [
  'tree_plantation',
  'forest_restoration',
  'urban_greening',
  'biodiversity',
  'water_conservation',
  'waste_management',
  'environmental_education',
  'rural_community_development',
  'other',
] as const;

export const NGO_ARTH_USAGE_GOALS = [
  'organise_plantation_drives',
  'recruit_volunteers',
  'source_saplings',
  'track_planted_trees',
  'manage_corporate_school_programs',
  'receive_donations',
  'showcase_projects',
  'other',
] as const;

export const NGO_PARTICIPANT_TYPES = [
  'individuals',
  'schools',
  'colleges',
  'corporates',
  'government',
  'communities',
  'volunteers',
  'other_ngos',
] as const;

export const officeBearerSchema = z.object({
  name: z.string().min(1).max(120),
  designation: z.string().max(80).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
});

// A shared shape for every "list of links" field in sections 5-6 (previous projects, drive
// reports, media coverage, project pages, annual/impact reports, social posts) — all optional,
// all URLs, all sent as JSON-in-a-string over multipart since URLs can legally contain commas.
export function linkListSchema(max = 20) {
  return jsonValue(z.array(websiteUrlSchema).max(max)).optional();
}

export const registerNgoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),

  // Organisation details — orgName/description are the only two fields required at this layer
  // (mirrors registerNurserySchema); everything else is required in the mobile/web wizard's own
  // step validation but kept optional here so the schema never blocks a partially-filled client.
  orgName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  orgType: z.enum(NGO_ORG_TYPES).optional(),
  foundedYear: z.coerce.number().int().min(1800).max(2100).optional(),
  line1: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  operatingCities: commaList(),
  operatingStates: commaList(),
  website: websiteUrlSchema.optional(),
  officialEmail: z.string().email().optional(),
  contactPhone: phoneSchema.optional(),
  socialMediaLinks: linkListSchema(),

  // Registration & legal — none of these are mandatory; a legitimate NGO may not hold every
  // registration yet.
  registrationNumber: z.string().max(80).optional(),
  registrationAuthority: z.string().max(120).optional(),
  panNumber: z.string().max(20).optional(),
  ngoDarpanId: z.string().max(40).optional(),
  twelveARegistrationNumber: z.string().max(60).optional(),
  eightyGRegistrationNumber: z.string().max(60).optional(),
  fcraRegistrationNumber: z.string().max(60).optional(),
  csr1RegistrationNumber: z.string().max(60).optional(),

  // People behind the organisation
  primaryContactName: z.string().max(120).optional(),
  primaryContactDesignation: z.string().max(80).optional(),
  primaryContactPhone: phoneSchema.optional(),
  primaryContactEmail: z.string().email().optional(),
  officeBearers: jsonValue(z.array(officeBearerSchema).max(3)).optional(),

  // What the NGO does
  primaryWorkAreas: commaList(),
  drivesConductedHistorical: z.coerce.number().int().min(0).max(1_000_000).optional(),
  treesPlantedHistorical: z.coerce.number().int().min(0).max(100_000_000).optional(),
  volunteerCountEstimate: z.coerce.number().int().min(0).max(1_000_000).optional(),
  majorProjectsDescription: z.string().max(2000).optional(),
  environmentalWorkSinceYear: z.coerce.number().int().min(1800).max(2100).optional(),

  // Plantation-specific
  conductsPlantationDrives: boolFromString,
  typicalSaplingsPerDrive: z.string().max(60).optional(),
  typicalDriveLocations: z.string().max(300).optional(),
  speciesCommonlyPlanted: z.string().max(300).optional(),
  saplingSourceDescription: z.string().max(500).optional(),
  monitorsSurvivalPostPlanting: boolFromString,
  doesPostPlantationMaintenance: boolFromString,
  plantationVerificationMethod: z.string().max(500).optional(),
  previousProjectLinks: linkListSchema(),

  // Proof of previous work — links only; past-work photos travel as multipart files, not JSON.
  driveReportLinks: linkListSchema(),
  mediaCoverageLinks: linkListSchema(),
  projectPageLinks: linkListSchema(),
  annualReportLinks: linkListSchema(),
  impactReportLinks: linkListSchema(),
  socialMediaPostLinks: linkListSchema(),

  // ARTH-specific
  arthUsageGoals: commaList(),
  expectedDrivesPerYear: z.coerce.number().int().min(0).max(10_000).optional(),
  participantTypes: commaList(),

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
