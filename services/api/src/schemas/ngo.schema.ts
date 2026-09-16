import { z } from 'zod';
import { websiteUrlSchema } from '../utils/websiteUrl';
import { phoneSchema } from '../utils/phone';
import { NGO_ORG_TYPES, boolFromString, commaList, officeBearerSchema, linkListSchema } from './auth.schema';

// Multipart form fields arrive as strings even when the value is logically an
// array/object (awards) — JSON-encoded client-side. A JSON body (no photo)
// already sends real arrays, so this passes those through untouched and only
// parses when the value is a string.
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

const awardSchema = z.object({
  title: z.string().min(1).max(200),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  issuer: z.string().max(200).optional(),
});

export const updateProfileSchema = z.object({
  orgName: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  website: websiteUrlSchema.optional(),
  contactPhone: phoneSchema.optional(),
  logoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  foundedYear: z.coerce.number().int().min(1800).max(2200).optional(),
  volunteerCountEstimate: z.coerce.number().int().min(0).max(1_000_000).optional(),
  awards: jsonValue(z.array(awardSchema).max(50)).optional(),
  // 'open' accepts followers instantly; 'approval' routes each one to the request inbox.
  followPolicy: z.enum(['open', 'approval']).optional(),

  // Everything below lets a rejected NGO fix bad KYC data before resubmitting — see
  // ngo.service.ts's resubmitProfile, which has no field allowlist of its own and relies on this
  // schema to gate what's actually editable.
  orgType: z.enum(NGO_ORG_TYPES).optional(),
  line1: z.string().max(300).optional(),
  operatingCities: commaList(),
  operatingStates: commaList(),
  officialEmail: z.string().email().optional(),
  socialMediaLinks: linkListSchema(),

  registrationNumber: z.string().max(80).optional(),
  registrationAuthority: z.string().max(120).optional(),
  panNumber: z.string().max(20).optional(),
  ngoDarpanId: z.string().max(40).optional(),
  twelveARegistrationNumber: z.string().max(60).optional(),
  eightyGRegistrationNumber: z.string().max(60).optional(),
  fcraRegistrationNumber: z.string().max(60).optional(),
  csr1RegistrationNumber: z.string().max(60).optional(),

  primaryContactName: z.string().max(120).optional(),
  primaryContactDesignation: z.string().max(80).optional(),
  primaryContactPhone: phoneSchema.optional(),
  primaryContactEmail: z.string().email().optional(),
  officeBearers: jsonValue(z.array(officeBearerSchema).max(3)).optional(),

  primaryWorkAreas: commaList(),
  drivesConductedHistorical: z.coerce.number().int().min(0).max(1_000_000).optional(),
  treesPlantedHistorical: z.coerce.number().int().min(0).max(100_000_000).optional(),
  majorProjectsDescription: z.string().max(2000).optional(),
  environmentalWorkSinceYear: z.coerce.number().int().min(1800).max(2100).optional(),

  conductsPlantationDrives: boolFromString,
  typicalSaplingsPerDrive: z.string().max(60).optional(),
  typicalDriveLocations: z.string().max(300).optional(),
  speciesCommonlyPlanted: z.string().max(300).optional(),
  saplingSourceDescription: z.string().max(500).optional(),
  monitorsSurvivalPostPlanting: boolFromString,
  doesPostPlantationMaintenance: boolFromString,
  plantationVerificationMethod: z.string().max(500).optional(),
  previousProjectLinks: linkListSchema(),

  driveReportLinks: linkListSchema(),
  mediaCoverageLinks: linkListSchema(),
  projectPageLinks: linkListSchema(),
  annualReportLinks: linkListSchema(),
  impactReportLinks: linkListSchema(),
  socialMediaPostLinks: linkListSchema(),

  arthUsageGoals: commaList(),
  expectedDrivesPerYear: z.coerce.number().int().min(0).max(10_000).optional(),
  participantTypes: commaList(),
});

export const donationsQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});
