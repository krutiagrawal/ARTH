import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { PasswordInput } from '../components/common/PasswordInput';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { CityPickerField } from '../components/common/CityPickerField';
import { SelectField, SelectOption } from '../components/common/SelectField';
import { PhoneField } from '../components/common/PhoneField';
import { Toggle } from '../components/common/Toggle';
import { ChipListField } from '../components/common/ChipListField';
import { DocumentPickerField } from '../components/common/DocumentPickerField';
import { OfficeBearerListField, OfficeBearer } from '../components/common/OfficeBearerListField';
import { MultiPhotoPickerField } from '../components/social/MultiPhotoPickerField';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import { useAuth } from '../context/AuthContext';
import type { NgoOrgType } from '../api/auth';
import { ApiError } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useEmailField } from '../hooks/useEmailField';
import { isValidWebsite, isValidPhone, sanitizePhoneDigits, isValidEmail } from '../utils/validation';

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'ngo';
}

const ORG_TYPE_OPTIONS: SelectOption[] = [
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'section8_company', label: 'Section 8 company' },
  { value: 'registered_nonprofit', label: 'Registered non-profit' },
  { value: 'other', label: 'Other' },
];

const WORK_AREA_OPTIONS: SelectOption[] = [
  { value: 'tree_plantation', label: 'Tree plantation', icon: '🌳' },
  { value: 'forest_restoration', label: 'Forest restoration', icon: '🌲' },
  { value: 'urban_greening', label: 'Urban greening', icon: '🏙️' },
  { value: 'biodiversity', label: 'Biodiversity', icon: '🦋' },
  { value: 'water_conservation', label: 'Water conservation', icon: '💧' },
  { value: 'waste_management', label: 'Waste management', icon: '♻️' },
  { value: 'environmental_education', label: 'Environmental education', icon: '📚' },
  { value: 'rural_community_development', label: 'Rural/community development', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '➕' },
];

const SAPLINGS_PER_DRIVE_OPTIONS: SelectOption[] = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_200', label: '50 – 200' },
  { value: '200_500', label: '200 – 500' },
  { value: '500_plus', label: '500+' },
];

const ARTH_USAGE_OPTIONS: SelectOption[] = [
  { value: 'organise_plantation_drives', label: 'Organise plantation drives', icon: '🌱' },
  { value: 'recruit_volunteers', label: 'Recruit volunteers', icon: '🙋' },
  { value: 'source_saplings', label: 'Source saplings', icon: '🪴' },
  { value: 'track_planted_trees', label: 'Track planted trees', icon: '📍' },
  { value: 'manage_corporate_school_programs', label: 'Manage corporate/school programs', icon: '🏫' },
  { value: 'receive_donations', label: 'Receive donations', icon: '💚' },
  { value: 'showcase_projects', label: 'Showcase projects', icon: '📣' },
  { value: 'other', label: 'Other', icon: '➕' },
];

const PARTICIPANT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'individuals', label: 'Individuals' },
  { value: 'schools', label: 'Schools' },
  { value: 'colleges', label: 'Colleges' },
  { value: 'corporates', label: 'Corporates' },
  { value: 'government', label: 'Government' },
  { value: 'communities', label: 'Communities' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'other_ngos', label: 'Other NGOs' },
];

const STEPS = [
  'orgIdentity',
  'addressContact',
  'legalRegistrations',
  'people',
  'whatYouDo',
  'plantationPractices',
  'proofOfWork',
  'arthGoals',
  'account',
] as const;
type Step = (typeof STEPS)[number];

const STEP_COPY: Record<Step, { emoji: string; title: string; subtitle: string }> = {
  orgIdentity: { emoji: '🏢', title: 'Your organisation', subtitle: 'The basics — who you are, legally.' },
  addressContact: { emoji: '📍', title: 'Where you work', subtitle: 'Registered address and how people can reach you.' },
  legalRegistrations: { emoji: '📄', title: 'Registrations you hold', subtitle: "Optional — add whichever apply. Don't worry if you don't have all of these yet." },
  people: { emoji: '👥', title: 'People behind the org', subtitle: 'Who represents this NGO, and proof you’re authorised to.' },
  whatYouDo: { emoji: '🌍', title: 'What you do', subtitle: 'Help us understand your work.' },
  plantationPractices: { emoji: '🌱', title: 'Your plantation practices', subtitle: 'This is where we tell a real plantation org from one that just claims to be.' },
  proofOfWork: { emoji: '📸', title: 'Show us your work', subtitle: 'Photos and links from past activities — not all mandatory.' },
  arthGoals: { emoji: '🎯', title: 'Using ARTH', subtitle: 'What would you like to do on ARTH?' },
  account: { emoji: '🔐', title: 'Create your login', subtitle: "Last step — you're almost in." },
};

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.dotsRow}>
      {STEPS.map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotDone]} />
      ))}
    </View>
  );
}

export function NgoRegisterScreen({ navigation }: any) {
  const { registerNgo } = useAuth();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Org identity
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<NgoOrgType | null>(null);
  const [foundedYear, setFoundedYear] = useState('');

  // Address & contact
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Pune');
  const [operatingCities, setOperatingCities] = useState<string[]>([]);
  const [operatingStates, setOperatingStates] = useState<string[]>([]);
  const [officialEmail, setOfficialEmail] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [socialMediaLinks, setSocialMediaLinks] = useState<string[]>([]);

  // Legal registrations
  const [hasRegistration, setHasRegistration] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationAuthority, setRegistrationAuthority] = useState('');
  const [registrationCertificate, setRegistrationCertificate] = useState<PickedPhoto | null>(null);
  const [panNumber, setPanNumber] = useState('');
  const [hasDarpan, setHasDarpan] = useState(false);
  const [ngoDarpanId, setNgoDarpanId] = useState('');
  const [has12A, setHas12A] = useState(false);
  const [twelveARegistrationNumber, setTwelveARegistrationNumber] = useState('');
  const [twelveACertificate, setTwelveACertificate] = useState<PickedPhoto | null>(null);
  const [has80G, setHas80G] = useState(false);
  const [eightyGRegistrationNumber, setEightyGRegistrationNumber] = useState('');
  const [eightyGCertificate, setEightyGCertificate] = useState<PickedPhoto | null>(null);
  const [hasFcra, setHasFcra] = useState(false);
  const [fcraRegistrationNumber, setFcraRegistrationNumber] = useState('');
  const [fcraCertificate, setFcraCertificate] = useState<PickedPhoto | null>(null);
  const [hasCsr1, setHasCsr1] = useState(false);
  const [csr1RegistrationNumber, setCsr1RegistrationNumber] = useState('');
  const [csr1Certificate, setCsr1Certificate] = useState<PickedPhoto | null>(null);

  // People
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactDesignation, setPrimaryContactDesignation] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [officeBearers, setOfficeBearers] = useState<OfficeBearer[]>([]);
  const [authorizationProof, setAuthorizationProof] = useState<PickedPhoto | null>(null);

  // What you do
  const [description, setDescription] = useState('');
  const [primaryWorkAreas, setPrimaryWorkAreas] = useState<string[]>([]);
  const [drivesConductedHistorical, setDrivesConductedHistorical] = useState('');
  const [treesPlantedHistorical, setTreesPlantedHistorical] = useState('');
  const [volunteerCountEstimate, setVolunteerCountEstimate] = useState('');
  const [majorProjectsDescription, setMajorProjectsDescription] = useState('');
  const [environmentalWorkSinceYear, setEnvironmentalWorkSinceYear] = useState('');

  // Plantation practices
  const [conductsPlantationDrives, setConductsPlantationDrives] = useState(false);
  const [typicalSaplingsPerDrive, setTypicalSaplingsPerDrive] = useState<string | null>(null);
  const [typicalDriveLocations, setTypicalDriveLocations] = useState('');
  const [speciesCommonlyPlanted, setSpeciesCommonlyPlanted] = useState('');
  const [saplingSourceDescription, setSaplingSourceDescription] = useState('');
  const [monitorsSurvivalPostPlanting, setMonitorsSurvivalPostPlanting] = useState(false);
  const [doesPostPlantationMaintenance, setDoesPostPlantationMaintenance] = useState(false);
  const [plantationVerificationMethod, setPlantationVerificationMethod] = useState('');
  const [previousProjectLinks, setPreviousProjectLinks] = useState<string[]>([]);

  // Proof of work
  const [pastWorkPhotos, setPastWorkPhotos] = useState<PickedPhoto[]>([]);
  const [driveReportLinks, setDriveReportLinks] = useState<string[]>([]);
  const [mediaCoverageLinks, setMediaCoverageLinks] = useState<string[]>([]);
  const [projectPageLinks, setProjectPageLinks] = useState<string[]>([]);
  const [annualReportLinks, setAnnualReportLinks] = useState<string[]>([]);
  const [impactReportLinks, setImpactReportLinks] = useState<string[]>([]);
  const [socialMediaPostLinks, setSocialMediaPostLinks] = useState<string[]>([]);

  // ARTH goals
  const [arthUsageGoals, setArthUsageGoals] = useState<string[]>([]);
  const [expectedDrivesPerYear, setExpectedDrivesPerYear] = useState('');
  const [participantTypes, setParticipantTypes] = useState<string[]>([]);

  // Account
  const email = useEmailField();
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateStep = (s: Step): string | null => {
    switch (s) {
      case 'orgIdentity':
        if (!orgName.trim()) return 'Enter your organisation name';
        if (!orgType) return 'Pick the legal structure that describes your organisation';
        return null;
      case 'addressContact':
        if (!line1.trim()) return 'Add your registered address';
        if (!city.trim()) return 'Pick a city';
        if (operatingCities.length === 0) return 'Add at least one city you operate in';
        if (!officialPhone.trim() || !isValidPhone(officialPhone)) return 'Enter a valid 10-digit official phone number';
        if (officialEmail.trim() && !isValidEmail(officialEmail)) return 'Enter a valid official email, or leave it blank';
        if (website.trim() && !isValidWebsite(website)) {
          setWebsiteTouched(true);
          return 'Enter a valid website URL';
        }
        return null;
      case 'legalRegistrations':
        return null;
      case 'people':
        if (!primaryContactName.trim()) return "Enter the primary contact's name";
        if (!primaryContactPhone.trim() || !isValidPhone(primaryContactPhone)) return "Enter a valid 10-digit phone for the primary contact";
        if (!authorizationProof) return "Upload proof that you're authorised to represent this NGO";
        return null;
      case 'whatYouDo':
        if (!description.trim()) return 'Tell us what your organisation does';
        if (primaryWorkAreas.length === 0) return 'Pick at least one area of work';
        return null;
      case 'plantationPractices':
        return null;
      case 'proofOfWork':
        return null;
      case 'arthGoals':
        if (arthUsageGoals.length === 0) return 'Pick at least one way you’d like to use ARTH';
        return null;
      case 'account':
        if (!email.value.trim()) return 'Enter an email';
        if (!email.valid) {
          email.setTouched(true);
          return 'Enter a valid email address';
        }
        if (email.taken) return 'This email is already registered';
        if (password.length < 8) return 'Password must be at least 8 characters';
        return null;
    }
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  };

  const goBack = () => {
    setError(null);
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleRegister = async () => {
    const message = validateStep('account');
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await registerNgo({
        name: primaryContactName.trim() || orgName.trim(),
        email: email.value.trim().toLowerCase(),
        password,
        handle: slugifyHandle(orgName),
        orgName: orgName.trim(),
        description: description.trim(),
        orgType: orgType as NgoOrgType,
        foundedYear: foundedYear.trim() ? Number(foundedYear.trim()) : undefined,
        line1: line1.trim(),
        city: city.trim() || undefined,
        operatingCities,
        operatingStates,
        website: website.trim() || undefined,
        officialEmail: officialEmail.trim() || undefined,
        contactPhone: sanitizePhoneDigits(officialPhone),
        socialMediaLinks,

        registrationNumber: hasRegistration ? registrationNumber.trim() || undefined : undefined,
        registrationAuthority: hasRegistration ? registrationAuthority.trim() || undefined : undefined,
        registrationCertificate: hasRegistration ? registrationCertificate ?? undefined : undefined,
        panNumber: panNumber.trim() || undefined,
        ngoDarpanId: hasDarpan ? ngoDarpanId.trim() || undefined : undefined,
        twelveARegistrationNumber: has12A ? twelveARegistrationNumber.trim() || undefined : undefined,
        twelveACertificate: has12A ? twelveACertificate ?? undefined : undefined,
        eightyGRegistrationNumber: has80G ? eightyGRegistrationNumber.trim() || undefined : undefined,
        eightyGCertificate: has80G ? eightyGCertificate ?? undefined : undefined,
        fcraRegistrationNumber: hasFcra ? fcraRegistrationNumber.trim() || undefined : undefined,
        fcraCertificate: hasFcra ? fcraCertificate ?? undefined : undefined,
        csr1RegistrationNumber: hasCsr1 ? csr1RegistrationNumber.trim() || undefined : undefined,
        csr1Certificate: hasCsr1 ? csr1Certificate ?? undefined : undefined,

        primaryContactName: primaryContactName.trim(),
        primaryContactDesignation: primaryContactDesignation.trim() || undefined,
        primaryContactPhone: sanitizePhoneDigits(primaryContactPhone),
        primaryContactEmail: primaryContactEmail.trim() || undefined,
        officeBearers: officeBearers
          .filter((b) => b.name.trim())
          .map((b) => ({
            name: b.name.trim(),
            designation: b.designation.trim() || undefined,
            phone: b.phone.trim() ? sanitizePhoneDigits(b.phone) : undefined,
            email: b.email.trim() || undefined,
          })),
        authorizationProof: authorizationProof!,

        primaryWorkAreas,
        drivesConductedHistorical: drivesConductedHistorical.trim() ? Number(drivesConductedHistorical.trim()) : undefined,
        treesPlantedHistorical: treesPlantedHistorical.trim() ? Number(treesPlantedHistorical.trim()) : undefined,
        volunteerCountEstimate: volunteerCountEstimate.trim() ? Number(volunteerCountEstimate.trim()) : undefined,
        majorProjectsDescription: majorProjectsDescription.trim() || undefined,
        environmentalWorkSinceYear: environmentalWorkSinceYear.trim() ? Number(environmentalWorkSinceYear.trim()) : undefined,

        conductsPlantationDrives,
        typicalSaplingsPerDrive: SAPLINGS_PER_DRIVE_OPTIONS.find((o) => o.value === typicalSaplingsPerDrive)?.label,
        typicalDriveLocations: typicalDriveLocations.trim() || undefined,
        speciesCommonlyPlanted: speciesCommonlyPlanted.trim() || undefined,
        saplingSourceDescription: saplingSourceDescription.trim() || undefined,
        monitorsSurvivalPostPlanting,
        doesPostPlantationMaintenance,
        plantationVerificationMethod: plantationVerificationMethod.trim() || undefined,
        previousProjectLinks,

        pastWorkPhotos,
        driveReportLinks,
        mediaCoverageLinks,
        projectPageLinks,
        annualReportLinks,
        impactReportLinks,
        socialMediaPostLinks,

        arthUsageGoals,
        expectedDrivesPerYear: expectedDrivesPerYear.trim() ? Number(expectedDrivesPerYear.trim()) : undefined,
        participantTypes,
      });
      navigation.reset({ index: 0, routes: [{ name: 'NgoMain' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <Text style={styles.logo}>ARTH</Text>
        <Text style={styles.tagline}>for NGOs & organizations</Text>

        <StepDots current={stepIndex} />
        <Text style={styles.stepCounter}>Step {stepIndex + 1} of {STEPS.length}</Text>

        <BorderCard style={styles.card}>
          <Text style={styles.title}>{STEP_COPY[step].emoji} {STEP_COPY[step].title}</Text>
          <Text style={styles.subtitle}>{STEP_COPY[step].subtitle}</Text>

          {step === 'orgIdentity' && (
            <>
              <TextInput style={styles.input} placeholder="Organisation name" placeholderTextColor={ON_DARK_SURFACE.muted} value={orgName} onChangeText={setOrgName} />
              <SelectField dark label="Organisation type" options={ORG_TYPE_OPTIONS} value={orgType} onChange={(v) => setOrgType(v as NgoOrgType)} />
              <TextInput
                style={styles.input}
                placeholder="Year established (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={foundedYear}
                onChangeText={setFoundedYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </>
          )}

          {step === 'addressContact' && (
            <>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Full registered address"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={line1}
                onChangeText={setLine1}
                multiline
              />
              <CityPickerField value={city} onChange={setCity} variant="dark" />
              <ChipListField dark label="Cities you operate in" placeholder="Add a city" values={operatingCities} onChange={setOperatingCities} />
              <ChipListField dark label="States you operate in (optional)" placeholder="Add a state" values={operatingStates} onChange={setOperatingStates} />
              <PhoneField dark label="Official phone number" value={officialPhone} onChangeText={setOfficialPhone} />
              <TextInput
                style={styles.input}
                placeholder="Official email (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={officialEmail}
                onChangeText={setOfficialEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Website (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="none"
                value={website}
                onChangeText={setWebsite}
                onBlur={() => setWebsiteTouched(true)}
              />
              {websiteTouched && website.trim() && !isValidWebsite(website) && (
                <Text style={styles.fieldError}>Enter a valid website URL</Text>
              )}
              <ChipListField
                dark
                label="Social media links (optional)"
                placeholder="Paste a link"
                values={socialMediaLinks}
                onChange={setSocialMediaLinks}
                keyboardType="url"
                validate={isValidWebsite}
                validationHint="Doesn't look like a valid link"
              />
            </>
          )}

          {step === 'legalRegistrations' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="PAN of organisation (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="characters"
                value={panNumber}
                onChangeText={setPanNumber}
              />

              <RegistrationToggleRow label="We have a registration certificate" value={hasRegistration} onValueChange={setHasRegistration} />
              {hasRegistration && (
                <>
                  <TextInput style={styles.input} placeholder="Registration number" placeholderTextColor={ON_DARK_SURFACE.muted} value={registrationNumber} onChangeText={setRegistrationNumber} />
                  <TextInput style={styles.input} placeholder="Registration authority" placeholderTextColor={ON_DARK_SURFACE.muted} value={registrationAuthority} onChangeText={setRegistrationAuthority} />
                  <DocumentPickerField label="Registration certificate" doc={registrationCertificate} onChange={setRegistrationCertificate} dark hint="PDF or photo" />
                </>
              )}

              <RegistrationToggleRow label="We're registered on NGO Darpan" value={hasDarpan} onValueChange={setHasDarpan} />
              {hasDarpan && (
                <TextInput style={styles.input} placeholder="NGO Darpan ID" placeholderTextColor={ON_DARK_SURFACE.muted} autoCapitalize="characters" value={ngoDarpanId} onChangeText={setNgoDarpanId} />
              )}

              <RegistrationToggleRow label="We have 12A / 12AB registration" value={has12A} onValueChange={setHas12A} />
              {has12A && (
                <>
                  <TextInput style={styles.input} placeholder="12A/12AB registration number" placeholderTextColor={ON_DARK_SURFACE.muted} value={twelveARegistrationNumber} onChangeText={setTwelveARegistrationNumber} />
                  <DocumentPickerField label="12A/12AB certificate" doc={twelveACertificate} onChange={setTwelveACertificate} dark hint="PDF or photo" />
                </>
              )}

              <RegistrationToggleRow label="We have 80G registration" value={has80G} onValueChange={setHas80G} />
              {has80G && (
                <>
                  <TextInput style={styles.input} placeholder="80G registration number" placeholderTextColor={ON_DARK_SURFACE.muted} value={eightyGRegistrationNumber} onChangeText={setEightyGRegistrationNumber} />
                  <DocumentPickerField label="80G certificate" doc={eightyGCertificate} onChange={setEightyGCertificate} dark hint="PDF or photo" />
                </>
              )}

              <RegistrationToggleRow label="We have FCRA registration" value={hasFcra} onValueChange={setHasFcra} />
              {hasFcra && (
                <>
                  <TextInput style={styles.input} placeholder="FCRA registration number" placeholderTextColor={ON_DARK_SURFACE.muted} value={fcraRegistrationNumber} onChangeText={setFcraRegistrationNumber} />
                  <DocumentPickerField label="FCRA certificate" doc={fcraCertificate} onChange={setFcraCertificate} dark hint="PDF or photo" />
                </>
              )}

              <RegistrationToggleRow label="We have CSR-1 registration" value={hasCsr1} onValueChange={setHasCsr1} />
              {hasCsr1 && (
                <>
                  <TextInput style={styles.input} placeholder="CSR-1 registration number" placeholderTextColor={ON_DARK_SURFACE.muted} value={csr1RegistrationNumber} onChangeText={setCsr1RegistrationNumber} />
                  <DocumentPickerField label="CSR-1 certificate" doc={csr1Certificate} onChange={setCsr1Certificate} dark hint="PDF or photo" />
                </>
              )}

              <Text style={styles.helperNote}>None of these are mandatory — add whichever you have to help us approve you faster.</Text>
            </>
          )}

          {step === 'people' && (
            <>
              <TextInput style={styles.input} placeholder="Primary contact's full name" placeholderTextColor={ON_DARK_SURFACE.muted} value={primaryContactName} onChangeText={setPrimaryContactName} />
              <TextInput style={styles.input} placeholder="Designation" placeholderTextColor={ON_DARK_SURFACE.muted} value={primaryContactDesignation} onChangeText={setPrimaryContactDesignation} />
              <PhoneField dark label="Primary contact's phone" value={primaryContactPhone} onChangeText={setPrimaryContactPhone} />
              <TextInput
                style={styles.input}
                placeholder="Primary contact's email (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={primaryContactEmail}
                onChangeText={setPrimaryContactEmail}
              />
              <OfficeBearerListField bearers={officeBearers} onChange={setOfficeBearers} />
              <DocumentPickerField
                label="Proof you're authorised to represent this NGO"
                hint="Board resolution, authorisation letter, or similar — PDF or photo"
                doc={authorizationProof}
                onChange={setAuthorizationProof}
                dark
              />
            </>
          )}

          {step === 'whatYouDo' && (
            <>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Brief description of your organisation"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <SelectField dark multi label="Primary areas of work" options={WORK_AREA_OPTIONS} value={primaryWorkAreas} onChange={setPrimaryWorkAreas} />
              <TextInput
                style={styles.input}
                placeholder="Approx. plantation drives conducted (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={drivesConductedHistorical}
                onChangeText={setDrivesConductedHistorical}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Approx. trees planted historically (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={treesPlantedHistorical}
                onChangeText={setTreesPlantedHistorical}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Approx. active volunteers (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={volunteerCountEstimate}
                onChangeText={setVolunteerCountEstimate}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Major projects / campaigns (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={majorProjectsDescription}
                onChangeText={setMajorProjectsDescription}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Conducting environmental work since (year, optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={environmentalWorkSinceYear}
                onChangeText={setEnvironmentalWorkSinceYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </>
          )}

          {step === 'plantationPractices' && (
            <>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>🌱 We currently conduct plantation drives</Text>
                <Toggle value={conductsPlantationDrives} onValueChange={setConductsPlantationDrives} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
              </View>
              {conductsPlantationDrives && (
                <>
                  <SelectField dark label="Typical saplings per drive" options={SAPLINGS_PER_DRIVE_OPTIONS} value={typicalSaplingsPerDrive} onChange={setTypicalSaplingsPerDrive} />
                  <TextInput style={styles.input} placeholder="Typical drive locations" placeholderTextColor={ON_DARK_SURFACE.muted} value={typicalDriveLocations} onChangeText={setTypicalDriveLocations} />
                  <TextInput style={styles.input} placeholder="Species commonly planted" placeholderTextColor={ON_DARK_SURFACE.muted} value={speciesCommonlyPlanted} onChangeText={setSpeciesCommonlyPlanted} />
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="Where do you source saplings from?"
                    placeholderTextColor={ON_DARK_SURFACE.muted}
                    value={saplingSourceDescription}
                    onChangeText={setSaplingSourceDescription}
                    multiline
                  />
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>We monitor survival post-planting</Text>
                    <Toggle value={monitorsSurvivalPostPlanting} onValueChange={setMonitorsSurvivalPostPlanting} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>We do post-plantation maintenance</Text>
                    <Toggle value={doesPostPlantationMaintenance} onValueChange={setDoesPostPlantationMaintenance} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
                  </View>
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="How do you verify trees were actually planted?"
                    placeholderTextColor={ON_DARK_SURFACE.muted}
                    value={plantationVerificationMethod}
                    onChangeText={setPlantationVerificationMethod}
                    multiline
                  />
                  <ChipListField
                    dark
                    label="Links to previous projects (optional)"
                    placeholder="Paste a link"
                    values={previousProjectLinks}
                    onChange={setPreviousProjectLinks}
                    keyboardType="url"
                    validate={isValidWebsite}
                    validationHint="Doesn't look like a valid link"
                  />
                </>
              )}
            </>
          )}

          {step === 'proofOfWork' && (
            <>
              <MultiPhotoPickerField photos={pastWorkPhotos} onChange={setPastWorkPhotos} max={5} label="Photos of previous plantation activities" hint="Optional — up to 5" />
              <ChipListField dark label="Plantation drive reports (optional)" placeholder="Paste a link" values={driveReportLinks} onChange={setDriveReportLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
              <ChipListField dark label="Newspaper/media coverage (optional)" placeholder="Paste a link" values={mediaCoverageLinks} onChange={setMediaCoverageLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
              <ChipListField dark label="Website/project pages (optional)" placeholder="Paste a link" values={projectPageLinks} onChange={setProjectPageLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
              <ChipListField dark label="Annual reports (optional)" placeholder="Paste a link" values={annualReportLinks} onChange={setAnnualReportLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
              <ChipListField dark label="Impact reports (optional)" placeholder="Paste a link" values={impactReportLinks} onChange={setImpactReportLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
              <ChipListField dark label="Social media posts (optional)" placeholder="Paste a link" values={socialMediaPostLinks} onChange={setSocialMediaPostLinks} keyboardType="url" validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            </>
          )}

          {step === 'arthGoals' && (
            <>
              <SelectField dark multi label="What would you like to use ARTH for?" options={ARTH_USAGE_OPTIONS} value={arthUsageGoals} onChange={setArthUsageGoals} />
              <TextInput
                style={styles.input}
                placeholder="Expected plantation drives per year via ARTH (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={expectedDrivesPerYear}
                onChangeText={setExpectedDrivesPerYear}
                keyboardType="number-pad"
              />
              <SelectField dark multi label="Who typically participates in your drives?" options={PARTICIPANT_TYPE_OPTIONS} value={participantTypes} onChange={setParticipantTypes} />
            </>
          )}

          {step === 'account' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email.value}
                onChangeText={email.setValue}
                onBlur={() => email.setTouched(true)}
              />
              {email.error ? (
                <Text style={styles.fieldError}>{email.error}</Text>
              ) : email.checking ? (
                <Text style={styles.helperNote}>Checking…</Text>
              ) : null}
              <PasswordInput
                inputStyle={styles.input}
                placeholder="Password (min. 8 characters)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={password}
                onChangeText={setPassword}
              />
              <Text style={styles.helperNote}>Your application will be reviewed before you can publish drives, campaigns, or receive donations.</Text>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.navRow}>
            {stepIndex > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={goBack} disabled={isSubmitting}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <AnimatedButton
                label={step === 'account' ? (isSubmitting ? 'Submitting…' : '🌱 Submit application') : 'Continue →'}
                onPress={step === 'account' ? handleRegister : goNext}
                disabled={isSubmitting}
                fullWidth
              />
            </View>
          </View>

          {stepIndex === 0 && (
            <>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.switchText}>
                  Already have an account? <Text style={styles.switchLink}>Log in</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.replace('AccountType')}>
                <Text style={styles.switchText}>
                  Not an NGO? <Text style={styles.switchLink}>Choose a different account type</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BorderCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RegistrationToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Toggle value={value} onValueChange={onValueChange} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.white,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: COLORS.mint, width: 20 },
  dotDone: { backgroundColor: 'rgba(200,230,192,0.6)' },
  stepCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    borderWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 22,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.sm,
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.white, flex: 1 },
  helperNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, marginBottom: SPACING.sm, lineHeight: 17 },
  fieldError: { fontSize: 12, color: COLORS.amberLight, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  error: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.coral,
    marginBottom: SPACING.sm,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SPACING.sm },
  backButton: { paddingHorizontal: 14, paddingVertical: 14 },
  backButtonText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  switchText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  switchLink: {
    color: COLORS.mint,
    fontWeight: '700',
  },
});
