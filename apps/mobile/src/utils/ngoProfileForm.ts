import type { ApiNgoProfile, UpdateNgoProfileInput } from '../api/ngo';
import type { OfficeBearer } from '../components/common/OfficeBearerListField';
import { sanitizePhoneDigits } from './validation';

/** Form state for the registration-time details on the NGO profile edit screen. */
export interface NgoDetailsForm {
  orgType: string | null;
  line1: string;
  operatingCities: string[];
  operatingStates: string[];
  officialEmail: string;
  socialMediaLinks: string[];

  registrationNumber: string;
  registrationAuthority: string;
  panNumber: string;
  ngoDarpanId: string;
  twelveARegistrationNumber: string;
  eightyGRegistrationNumber: string;
  fcraRegistrationNumber: string;
  csr1RegistrationNumber: string;

  primaryContactName: string;
  primaryContactDesignation: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  officeBearers: OfficeBearer[];

  primaryWorkAreas: string[];
  drivesConductedHistorical: string;
  treesPlantedHistorical: string;
  majorProjectsDescription: string;
  environmentalWorkSinceYear: string;

  conductsPlantationDrives: boolean;
  typicalSaplingsPerDrive: string | null;
  typicalDriveLocations: string;
  speciesCommonlyPlanted: string;
  saplingSourceDescription: string;
  monitorsSurvivalPostPlanting: boolean;
  doesPostPlantationMaintenance: boolean;
  plantationVerificationMethod: string;
  previousProjectLinks: string[];

  driveReportLinks: string[];
  mediaCoverageLinks: string[];
  projectPageLinks: string[];
  annualReportLinks: string[];
  impactReportLinks: string[];
  socialMediaPostLinks: string[];

  arthUsageGoals: string[];
  expectedDrivesPerYear: string;
  participantTypes: string[];
}

export const EMPTY_NGO_DETAILS: NgoDetailsForm = {
  orgType: null,
  line1: '',
  operatingCities: [],
  operatingStates: [],
  officialEmail: '',
  socialMediaLinks: [],
  registrationNumber: '',
  registrationAuthority: '',
  panNumber: '',
  ngoDarpanId: '',
  twelveARegistrationNumber: '',
  eightyGRegistrationNumber: '',
  fcraRegistrationNumber: '',
  csr1RegistrationNumber: '',
  primaryContactName: '',
  primaryContactDesignation: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  officeBearers: [],
  primaryWorkAreas: [],
  drivesConductedHistorical: '',
  treesPlantedHistorical: '',
  majorProjectsDescription: '',
  environmentalWorkSinceYear: '',
  conductsPlantationDrives: false,
  typicalSaplingsPerDrive: null,
  typicalDriveLocations: '',
  speciesCommonlyPlanted: '',
  saplingSourceDescription: '',
  monitorsSurvivalPostPlanting: false,
  doesPostPlantationMaintenance: false,
  plantationVerificationMethod: '',
  previousProjectLinks: [],
  driveReportLinks: [],
  mediaCoverageLinks: [],
  projectPageLinks: [],
  annualReportLinks: [],
  impactReportLinks: [],
  socialMediaPostLinks: [],
  arthUsageGoals: [],
  expectedDrivesPerYear: '',
  participantTypes: [],
};

const str = (v: string | null | undefined) => v ?? '';
const num = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function detailsFromProfile(p: ApiNgoProfile): NgoDetailsForm {
  return {
    orgType: p.orgType ?? null,
    line1: str(p.line1),
    operatingCities: p.operatingCities ?? [],
    operatingStates: p.operatingStates ?? [],
    officialEmail: str(p.officialEmail),
    socialMediaLinks: p.socialMediaLinks ?? [],
    registrationNumber: str(p.registrationNumber),
    registrationAuthority: str(p.registrationAuthority),
    panNumber: str(p.panNumber),
    ngoDarpanId: str(p.ngoDarpanId),
    twelveARegistrationNumber: str(p.twelveARegistrationNumber),
    eightyGRegistrationNumber: str(p.eightyGRegistrationNumber),
    fcraRegistrationNumber: str(p.fcraRegistrationNumber),
    csr1RegistrationNumber: str(p.csr1RegistrationNumber),
    primaryContactName: str(p.primaryContactName),
    primaryContactDesignation: str(p.primaryContactDesignation),
    primaryContactPhone: str(p.primaryContactPhone),
    primaryContactEmail: str(p.primaryContactEmail),
    officeBearers: (p.officeBearers ?? []).map((b) => ({
      name: b.name ?? '',
      designation: b.designation ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
    })),
    primaryWorkAreas: p.primaryWorkAreas ?? [],
    drivesConductedHistorical: num(p.drivesConductedHistorical),
    treesPlantedHistorical: num(p.treesPlantedHistorical),
    majorProjectsDescription: str(p.majorProjectsDescription),
    environmentalWorkSinceYear: num(p.environmentalWorkSinceYear),
    conductsPlantationDrives: !!p.conductsPlantationDrives,
    typicalSaplingsPerDrive: p.typicalSaplingsPerDrive ?? null,
    typicalDriveLocations: str(p.typicalDriveLocations),
    speciesCommonlyPlanted: str(p.speciesCommonlyPlanted),
    saplingSourceDescription: str(p.saplingSourceDescription),
    monitorsSurvivalPostPlanting: !!p.monitorsSurvivalPostPlanting,
    doesPostPlantationMaintenance: !!p.doesPostPlantationMaintenance,
    plantationVerificationMethod: str(p.plantationVerificationMethod),
    previousProjectLinks: p.previousProjectLinks ?? [],
    driveReportLinks: p.driveReportLinks ?? [],
    mediaCoverageLinks: p.mediaCoverageLinks ?? [],
    projectPageLinks: p.projectPageLinks ?? [],
    annualReportLinks: p.annualReportLinks ?? [],
    impactReportLinks: p.impactReportLinks ?? [],
    socialMediaPostLinks: p.socialMediaPostLinks ?? [],
    arthUsageGoals: p.arthUsageGoals ?? [],
    expectedDrivesPerYear: num(p.expectedDrivesPerYear),
    participantTypes: p.participantTypes ?? [],
  };
}

const toNumber = (v: string) => (v.trim() ? Number(v) : undefined);

/**
 * Maps the form back to the PATCH payload. Legal fields are left out entirely once the account is
 * approved (`includeLegal` false) - they're locked server-side anyway, so there's nothing to send.
 */
export function detailsToInput(d: NgoDetailsForm, includeLegal: boolean): UpdateNgoProfileInput {
  const input: UpdateNgoProfileInput = {
    line1: d.line1.trim(),
    operatingCities: d.operatingCities,
    operatingStates: d.operatingStates,
    officialEmail: d.officialEmail.trim(),
    socialMediaLinks: d.socialMediaLinks,

    primaryContactName: d.primaryContactName.trim(),
    primaryContactDesignation: d.primaryContactDesignation.trim(),
    primaryContactPhone: d.primaryContactPhone ? sanitizePhoneDigits(d.primaryContactPhone) : '',
    primaryContactEmail: d.primaryContactEmail.trim(),

    primaryWorkAreas: d.primaryWorkAreas,
    drivesConductedHistorical: toNumber(d.drivesConductedHistorical),
    treesPlantedHistorical: toNumber(d.treesPlantedHistorical),
    majorProjectsDescription: d.majorProjectsDescription.trim(),
    environmentalWorkSinceYear: toNumber(d.environmentalWorkSinceYear),

    conductsPlantationDrives: d.conductsPlantationDrives,
    typicalSaplingsPerDrive: d.typicalSaplingsPerDrive ?? undefined,
    typicalDriveLocations: d.typicalDriveLocations.trim(),
    speciesCommonlyPlanted: d.speciesCommonlyPlanted.trim(),
    saplingSourceDescription: d.saplingSourceDescription.trim(),
    monitorsSurvivalPostPlanting: d.monitorsSurvivalPostPlanting,
    doesPostPlantationMaintenance: d.doesPostPlantationMaintenance,
    plantationVerificationMethod: d.plantationVerificationMethod.trim(),
    previousProjectLinks: d.previousProjectLinks,

    driveReportLinks: d.driveReportLinks,
    mediaCoverageLinks: d.mediaCoverageLinks,
    projectPageLinks: d.projectPageLinks,
    annualReportLinks: d.annualReportLinks,
    impactReportLinks: d.impactReportLinks,
    socialMediaPostLinks: d.socialMediaPostLinks,

    arthUsageGoals: d.arthUsageGoals,
    expectedDrivesPerYear: toNumber(d.expectedDrivesPerYear),
    participantTypes: d.participantTypes,
  };

  if (includeLegal) {
    input.orgType = d.orgType ?? undefined;
    input.registrationNumber = d.registrationNumber.trim();
    input.registrationAuthority = d.registrationAuthority.trim();
    input.panNumber = d.panNumber.trim().toUpperCase();
    input.ngoDarpanId = d.ngoDarpanId.trim();
    input.twelveARegistrationNumber = d.twelveARegistrationNumber.trim();
    input.eightyGRegistrationNumber = d.eightyGRegistrationNumber.trim();
    input.fcraRegistrationNumber = d.fcraRegistrationNumber.trim();
    input.csr1RegistrationNumber = d.csr1RegistrationNumber.trim();
    input.officeBearers = d.officeBearers
      .filter((b) => b.name.trim())
      .map((b) => ({
        name: b.name.trim(),
        designation: b.designation.trim() || undefined,
        phone: b.phone.trim() ? sanitizePhoneDigits(b.phone) : undefined,
        email: b.email.trim() || undefined,
      }));
  }
  return input;
}

/** How many of a section's key fields are filled in - drives the "3 of 6 filled" hint on the profile hub. */
export function sectionProgress(
  p: ApiNgoProfile,
  section: 'basic' | 'organisation' | 'people' | 'legal' | 'awards' | 'work' | 'plantation' | 'links' | 'arth',
): { filled: number; total: number } {
  const d = detailsFromProfile(p);
  const checks: unknown[] = {
    basic: [p.orgName, p.description, p.website, p.contactPhone, p.city, p.foundedYear, p.volunteerCountEstimate],
    organisation: [d.orgType, d.line1, d.operatingCities.length, d.operatingStates.length, d.officialEmail, d.socialMediaLinks.length],
    people: [d.primaryContactName, d.primaryContactDesignation, d.primaryContactPhone, d.primaryContactEmail, d.officeBearers.length],
    legal: [d.panNumber, d.registrationNumber, d.registrationAuthority],
    awards: [(p.awards ?? []).length],
    work: [d.primaryWorkAreas.length, d.drivesConductedHistorical, d.treesPlantedHistorical, d.majorProjectsDescription, d.environmentalWorkSinceYear],
    plantation: [d.typicalSaplingsPerDrive, d.typicalDriveLocations, d.speciesCommonlyPlanted, d.plantationVerificationMethod],
    links: [
      d.previousProjectLinks.length + d.driveReportLinks.length + d.mediaCoverageLinks.length + d.projectPageLinks.length +
        d.annualReportLinks.length + d.impactReportLinks.length + d.socialMediaPostLinks.length,
    ],
    arth: [d.arthUsageGoals.length, d.participantTypes.length, d.expectedDrivesPerYear],
  }[section];
  return { filled: checks.filter(Boolean).length, total: checks.length };
}
