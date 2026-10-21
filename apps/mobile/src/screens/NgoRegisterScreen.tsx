import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { FieldLabel } from '../components/common/RequiredMark';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { TYPOGRAPHY, TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import {
  NgoField,
  FormErrorProvider,
  FieldGroup,
  Disclosure,
  RegistrationCard,
  StepProgress,
  StepTransition,
} from '../components/ngo/NgoFormParts';
import { PasswordInput } from '../components/common/PasswordInput';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { CityPickerField } from '../components/common/CityPickerField';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { SelectField, SelectOption } from '../components/common/SelectField';
import { PhoneField } from '../components/common/PhoneField';
import { Toggle } from '../components/common/Toggle';
import { ChipListField } from '../components/common/ChipListField';
import { DocumentPickerField } from '../components/common/DocumentPickerField';
import { OfficeBearerListField, OfficeBearer } from '../components/common/OfficeBearerListField';
import { MultiPhotoPickerField } from '../components/social/MultiPhotoPickerField';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import { useCities } from '../hooks/useApiQueries';
import { useAuth } from '../context/AuthContext';
import type { NgoOrgType } from '../api/auth';
import { ApiError } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useEmailField } from '../hooks/useEmailField';
import { isValidWebsite, isValidPhone, sanitizePhoneDigits, isValidEmail, isValidPan, isValidYear, isIntInRange, normalizeUrl } from '../utils/validation';
import { INDIAN_STATES_AND_UTS } from '../constants/indianStates';
import { MultiPickerField } from '../components/common/MultiPickerField';
import { ORG_TYPE_OPTIONS, WORK_AREA_OPTIONS, SAPLINGS_PER_DRIVE_OPTIONS, ARTH_USAGE_OPTIONS, PARTICIPANT_TYPE_OPTIONS } from '../constants/ngoOptions';

type StepError = { key: string; message: string };

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'ngo';
}

const STEPS = [
  'orgIdentity',
  'addressContact',
  'legalRegistrations',
  'people',
  'whatYouDo',
  'plantationProof',
  'arthGoals',
  'account',
] as const;
type Step = (typeof STEPS)[number];

const STEP_COPY: Record<Step, { emoji: string; title: string; subtitle: string }> = {
  orgIdentity: { emoji: '🏢', title: 'Your organisation', subtitle: 'The basics – who you are, legally.' },
  addressContact: { emoji: '📍', title: 'Where you work', subtitle: 'Your address and how to reach you.' },
  legalRegistrations: { emoji: '📄', title: 'Registrations', subtitle: 'Optional – add whichever you have.' },
  people: { emoji: '👥', title: 'People behind the org', subtitle: 'Who represents this NGO.' },
  whatYouDo: { emoji: '🌍', title: 'What you do', subtitle: 'Help us understand your work.' },
  plantationProof: { emoji: '🌱', title: 'Plantation work', subtitle: 'Optional – helps us verify your impact.' },
  arthGoals: { emoji: '🎯', title: 'Using ARTH', subtitle: 'What would you like to do here?' },
  account: { emoji: '🔐', title: 'Create your login', subtitle: 'Last step – almost in.' },
};

export function NgoRegisterScreen({ navigation }: any) {
  const { registerNgo } = useAuth();
  const { data: cityList = [] } = useCities();
  const cityNames = useMemo(() => cityList.map((c) => c.name), [cityList]);
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

  const [error, setError] = useState<(StepError & { id: number }) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const showError = (e: StepError) => setError({ ...e, id: Date.now() });

  // Bring the offending field into view: its on-screen y plus the current scroll offset.
  const scrollToView = useCallback((view: View) => {
    view.measureInWindow((_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + y - 140), animated: true });
    });
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fail = (key: string, message: string): StepError => ({ key, message });

  const validateStep = (s: Step): StepError | null => {
    switch (s) {
      case 'orgIdentity':
        if (!orgName.trim()) return fail('orgName', 'Enter your organisation name');
        if (!orgType) return fail('orgType', 'Pick the legal structure that describes your organisation');
        if (foundedYear.trim() && !isValidYear(foundedYear)) return fail('foundedYear', `Enter a valid 4-digit year (1800–${new Date().getFullYear()})`);
        return null;
      case 'addressContact':
        if (!line1.trim()) return fail('line1', 'Add your registered address');
        if (!city.trim()) return fail('city', 'Pick a city');
        if (operatingCities.length === 0) return fail('operatingCities', 'Add at least one city you operate in');
        if (!officialPhone.trim() || !isValidPhone(officialPhone)) return fail('officialPhone', 'Enter a valid 10-digit official phone number');
        if (officialEmail.trim() && !isValidEmail(officialEmail)) return fail('officialEmail', 'Enter a valid official email, or leave it blank');
        if (website.trim() && !isValidWebsite(website)) {
          setWebsiteTouched(true);
          return fail('website', 'Enter a valid website URL');
        }
        return null;
      case 'legalRegistrations':
        if (panNumber.trim() && !isValidPan(panNumber)) return fail('panNumber', 'Enter a valid PAN, like ABCDE1234F');
        return null;
      case 'people':
        if (!primaryContactName.trim()) return fail('primaryContactName', "Enter the primary contact's name");
        if (!primaryContactPhone.trim() || !isValidPhone(primaryContactPhone)) return fail('primaryContactPhone', "Enter a valid 10-digit phone for the primary contact");
        if (primaryContactEmail.trim() && !isValidEmail(primaryContactEmail)) return fail('primaryContactEmail', 'Enter a valid email, or leave it blank');
        if (!authorizationProof) return fail('authorizationProof', "Upload proof that you're authorised to represent this NGO");
        return null;
      case 'whatYouDo':
        if (!description.trim()) return fail('description', 'Tell us what your organisation does');
        if (primaryWorkAreas.length === 0) return fail('primaryWorkAreas', 'Pick at least one area of work');
        if (drivesConductedHistorical.trim() && !isIntInRange(drivesConductedHistorical, 1_000_000)) return fail('drivesConductedHistorical', 'Enter a whole number up to 1,000,000');
        if (treesPlantedHistorical.trim() && !isIntInRange(treesPlantedHistorical, 100_000_000)) return fail('treesPlantedHistorical', 'Enter a whole number up to 100,000,000');
        if (volunteerCountEstimate.trim() && !isIntInRange(volunteerCountEstimate, 1_000_000)) return fail('volunteerCountEstimate', 'Enter a whole number up to 1,000,000');
        if (environmentalWorkSinceYear.trim() && !isValidYear(environmentalWorkSinceYear)) return fail('environmentalWorkSinceYear', `Enter a valid 4-digit year (1800–${new Date().getFullYear()})`);
        return null;
      case 'plantationProof':
        return null;
      case 'arthGoals':
        if (arthUsageGoals.length === 0) return fail('arthUsageGoals', 'Pick at least one way you’d like to use ARTH');
        if (expectedDrivesPerYear.trim() && !isIntInRange(expectedDrivesPerYear, 10_000)) return fail('expectedDrivesPerYear', 'Enter a whole number up to 10,000');
        return null;
      case 'account':
        if (!email.value.trim()) return fail('email', 'Enter an email');
        if (!email.valid) {
          email.setTouched(true);
          return fail('email', 'Enter a valid email address');
        }
        if (email.taken) return fail('email', 'This email is already registered');
        if (password.length < 8) return fail('password', 'Password must be at least 8 characters');
        return null;
    }
  };

  const goNext = () => {
    const failure = validateStep(step);
    if (failure) {
      showError(failure);
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
    const failure = validateStep('account');
    if (failure) {
      showError(failure);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await registerNgo({
        name: (primaryContactName.trim() || orgName.trim()).slice(0, 60),
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
        website: website.trim() ? normalizeUrl(website) : undefined,
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
      console.error('[NgoRegister] submit failed', e);
      showError({
        key: 'form',
        message: e instanceof ApiError ? e.message : `Couldn't submit: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkProps = { keyboardType: 'url' as const, validate: isValidWebsite, validationHint: "Doesn't look like a valid link" };
  const openContactMore = error?.key === 'officialEmail' || error?.key === 'website';
  const openTeamMore = error?.key === 'primaryContactEmail';
  const openTrackRecord = ['drivesConductedHistorical', 'treesPlantedHistorical', 'volunteerCountEstimate', 'environmentalWorkSinceYear'].includes(error?.key ?? '');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <Text style={styles.logo}>ARTH</Text>
        <Text style={styles.tagline}>for NGOs & organizations</Text>

        <StepProgress current={stepIndex} total={STEPS.length} title={STEP_COPY[step].title} />

        <BorderCard style={styles.card}>
          <View style={styles.header}>
            <View style={styles.emojiBadge}>
              <Text style={styles.emoji}>{STEP_COPY[step].emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{STEP_COPY[step].title}</Text>
              <Text style={styles.subtitle}>{STEP_COPY[step].subtitle}</Text>
            </View>
          </View>

          <FormErrorProvider value={{ errorKey: error?.key ?? null, message: error?.message ?? null, id: error?.id ?? 0, scrollToView }}>
          <StepTransition stepKey={step}>
            {step === 'orgIdentity' && (
              <>
                <NgoField required name="orgName" label="Organisation name" placeholder="e.g. Green Earth Foundation" maxLength={120} value={orgName} onChangeText={setOrgName} />
                <FieldGroup name="orgType">
                  <SelectField dark required layout="list" label="Organisation type" options={ORG_TYPE_OPTIONS} value={orgType} onChange={(v) => setOrgType(v as NgoOrgType)} />
                </FieldGroup>
                <NgoField name="foundedYear" label="Year established" optional placeholder="e.g. 2012" value={foundedYear} onChangeText={setFoundedYear} keyboardType="number-pad" maxLength={4} />
              </>
            )}

            {step === 'addressContact' && (
              <>
                <FieldGroup name="line1">
                  <AddressSearchField
                    dark
                    allowCurrentLocation
                    required
                    maxLength={300}
                    label="Full registered address"
                    value={line1}
                    onChangeText={setLine1}
                    placeholder="Street / area / landmark"
                    multiline
                    onSelectSuggestion={(s) => setLine1(s.label)}
                  />
                </FieldGroup>
                <FieldGroup name="city">
                  <CityPickerField required value={city} onChange={setCity} variant="dark" />
                </FieldGroup>
                <FieldGroup name="operatingCities">
                  <ChipListField dark required label="Cities you operate in" maxItemLength={60} placeholder="Search or add a city" suggestions={cityNames} values={operatingCities} onChange={setOperatingCities} />
                </FieldGroup>
                <FieldGroup name="officialPhone">
                  <PhoneField dark required label="Official phone number" value={officialPhone} onChangeText={setOfficialPhone} />
                </FieldGroup>

                <Disclosure title="More contact details" subtitle="Email, website, states, social links" forceOpen={openContactMore}>
                  <NgoField name="officialEmail" label="Official email" optional maxLength={254} placeholder="contact@yourngo.org" autoCapitalize="none" keyboardType="email-address" value={officialEmail} onChangeText={setOfficialEmail} />
                  <NgoField
                    name="website"
                    label="Website"
                    optional
                    placeholder="https://"
                    maxLength={300}
                    autoCapitalize="none"
                    value={website}
                    onChangeText={setWebsite}
                    onBlur={() => setWebsiteTouched(true)}
                    error={websiteTouched && website.trim() && !isValidWebsite(website) ? 'Enter a valid website URL' : null}
                  />
                  <FieldGroup>
                    <MultiPickerField dark label="States you operate in" placeholder="Select states / UTs" sheetTitle="States and Union Territories" options={INDIAN_STATES_AND_UTS} values={operatingStates} onChange={setOperatingStates} />
                  </FieldGroup>
                  <FieldGroup>
                    <ChipListField dark label="Social media links" placeholder="Paste a link" values={socialMediaLinks} onChange={setSocialMediaLinks} {...linkProps} />
                  </FieldGroup>
                </Disclosure>
              </>
            )}

            {step === 'legalRegistrations' && (
              <>
                <NgoField name="panNumber" label="PAN of organisation" optional maxLength={10} autoCapitalize="characters" placeholder="ABCDE1234F" value={panNumber} onChangeText={(t) => setPanNumber(t.toUpperCase())} />

                <RegistrationCard icon="📜" title="Registration certificate" description="Trust deed, society or Section 8" value={hasRegistration} onValueChange={setHasRegistration}>
                  <NgoField label="Registration number" maxLength={80} value={registrationNumber} onChangeText={setRegistrationNumber} />
                  <NgoField label="Registration authority" maxLength={120} value={registrationAuthority} onChangeText={setRegistrationAuthority} />
                  <DocumentPickerField label="Registration certificate" doc={registrationCertificate} onChange={setRegistrationCertificate} dark hint="PDF or photo" />
                </RegistrationCard>

                <RegistrationCard icon="🏛️" title="NGO Darpan" description="Registered on the NITI Aayog portal" value={hasDarpan} onValueChange={setHasDarpan}>
                  <NgoField label="NGO Darpan ID" maxLength={40} autoCapitalize="characters" value={ngoDarpanId} onChangeText={setNgoDarpanId} />
                </RegistrationCard>

                <RegistrationCard icon="🧾" title="12A / 12AB" description="Income tax exemption" value={has12A} onValueChange={setHas12A}>
                  <NgoField label="Registration number" maxLength={60} value={twelveARegistrationNumber} onChangeText={setTwelveARegistrationNumber} />
                  <DocumentPickerField label="12A/12AB certificate" doc={twelveACertificate} onChange={setTwelveACertificate} dark hint="PDF or photo" />
                </RegistrationCard>

                <RegistrationCard icon="💚" title="80G" description="Donors get tax deductions" value={has80G} onValueChange={setHas80G}>
                  <NgoField label="Registration number" maxLength={60} value={eightyGRegistrationNumber} onChangeText={setEightyGRegistrationNumber} />
                  <DocumentPickerField label="80G certificate" doc={eightyGCertificate} onChange={setEightyGCertificate} dark hint="PDF or photo" />
                </RegistrationCard>

                <RegistrationCard icon="🌐" title="FCRA" description="Foreign contributions" value={hasFcra} onValueChange={setHasFcra}>
                  <NgoField label="Registration number" maxLength={60} value={fcraRegistrationNumber} onChangeText={setFcraRegistrationNumber} />
                  <DocumentPickerField label="FCRA certificate" doc={fcraCertificate} onChange={setFcraCertificate} dark hint="PDF or photo" />
                </RegistrationCard>

                <RegistrationCard icon="🏢" title="CSR-1" description="Eligible for corporate CSR funds" value={hasCsr1} onValueChange={setHasCsr1}>
                  <NgoField label="Registration number" maxLength={60} value={csr1RegistrationNumber} onChangeText={setCsr1RegistrationNumber} />
                  <DocumentPickerField label="CSR-1 certificate" doc={csr1Certificate} onChange={setCsr1Certificate} dark hint="PDF or photo" />
                </RegistrationCard>

                <Text style={styles.helperNote}>None of these are mandatory – adding what you have helps us approve you faster.</Text>
              </>
            )}

            {step === 'people' && (
              <>
                <NgoField required name="primaryContactName" label="Primary contact's full name" maxLength={60} value={primaryContactName} onChangeText={setPrimaryContactName} />
                <FieldGroup name="primaryContactPhone">
                  <PhoneField dark required label="Primary contact's phone" value={primaryContactPhone} onChangeText={setPrimaryContactPhone} />
                </FieldGroup>
                <FieldGroup name="authorizationProof">
                  <DocumentPickerField
                    required
                    label="Proof you're authorised to represent this NGO"
                    hint="Board resolution, authorisation letter, or similar – PDF or photo"
                    doc={authorizationProof}
                    onChange={setAuthorizationProof}
                    dark
                  />
                </FieldGroup>

                <Disclosure title="More about your team" subtitle="Designation, email, office bearers" forceOpen={openTeamMore}>
                  <NgoField label="Designation" optional maxLength={80} value={primaryContactDesignation} onChangeText={setPrimaryContactDesignation} />
                  <NgoField name="primaryContactEmail" label="Contact email" optional maxLength={254} autoCapitalize="none" keyboardType="email-address" value={primaryContactEmail} onChangeText={setPrimaryContactEmail} />
                  <FieldGroup>
                    <OfficeBearerListField bearers={officeBearers} onChange={setOfficeBearers} />
                  </FieldGroup>
                </Disclosure>
              </>
            )}

            {step === 'whatYouDo' && (
              <>
                <NgoField required name="description" label="About your organisation" placeholder="What does your organisation do?" maxLength={2000} multiline value={description} onChangeText={setDescription} />
                <FieldGroup name="primaryWorkAreas">
                  <SelectField dark multi required layout="list" hint="Select all that apply" label="Primary areas of work" options={WORK_AREA_OPTIONS} value={primaryWorkAreas} onChange={setPrimaryWorkAreas} />
                </FieldGroup>

                <Disclosure title="Your track record" subtitle="Drives, trees planted, volunteers, projects" forceOpen={openTrackRecord}>
                  <NgoField name="drivesConductedHistorical" label="Plantation drives conducted" optional maxLength={7} placeholder="Approx." value={drivesConductedHistorical} onChangeText={setDrivesConductedHistorical} keyboardType="number-pad" />
                  <NgoField name="treesPlantedHistorical" label="Trees planted" optional maxLength={9} placeholder="Approx." value={treesPlantedHistorical} onChangeText={setTreesPlantedHistorical} keyboardType="number-pad" />
                  <NgoField name="volunteerCountEstimate" label="Active volunteers" optional maxLength={7} placeholder="Approx." value={volunteerCountEstimate} onChangeText={setVolunteerCountEstimate} keyboardType="number-pad" />
                  <NgoField label="Major projects / campaigns" optional maxLength={2000} multiline value={majorProjectsDescription} onChangeText={setMajorProjectsDescription} />
                  <NgoField name="environmentalWorkSinceYear" label="Doing environmental work since" optional placeholder="Year" value={environmentalWorkSinceYear} onChangeText={setEnvironmentalWorkSinceYear} keyboardType="number-pad" maxLength={4} />
                </Disclosure>
              </>
            )}

            {step === 'plantationProof' && (
              <>
                <RegistrationCard icon="🌱" title="We conduct plantation drives" description="Tell us how you run them" value={conductsPlantationDrives} onValueChange={setConductsPlantationDrives}>
                  <FieldGroup>
                    <SelectField dark layout="grid" label="Typical saplings per drive" options={SAPLINGS_PER_DRIVE_OPTIONS} value={typicalSaplingsPerDrive} onChange={setTypicalSaplingsPerDrive} />
                  </FieldGroup>
                  <NgoField label="Typical drive locations" maxLength={300} value={typicalDriveLocations} onChangeText={setTypicalDriveLocations} />
                  <NgoField label="Species commonly planted" maxLength={300} value={speciesCommonlyPlanted} onChangeText={setSpeciesCommonlyPlanted} />
                  <NgoField label="How do you verify trees were planted?" maxLength={500} multiline value={plantationVerificationMethod} onChangeText={setPlantationVerificationMethod} />
                  <NgoField label="Where do you source saplings?" optional maxLength={500} multiline value={saplingSourceDescription} onChangeText={setSaplingSourceDescription} />
                  <RegistrationToggleRow label="We monitor survival post-planting" value={monitorsSurvivalPostPlanting} onValueChange={setMonitorsSurvivalPostPlanting} />
                  <RegistrationToggleRow label="We do post-plantation maintenance" value={doesPostPlantationMaintenance} onValueChange={setDoesPostPlantationMaintenance} />
                </RegistrationCard>

                <FieldGroup>
                  <MultiPhotoPickerField dark photos={pastWorkPhotos} onChange={setPastWorkPhotos} max={5} label="Photos of previous plantation activities" hint="Optional – up to 5" />
                </FieldGroup>

                <Disclosure title="Supporting links" subtitle="Reports, media coverage, project pages">
                  <FieldGroup><ChipListField dark label="Previous projects" placeholder="Paste a link" values={previousProjectLinks} onChange={setPreviousProjectLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Plantation drive reports" placeholder="Paste a link" values={driveReportLinks} onChange={setDriveReportLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Newspaper / media coverage" placeholder="Paste a link" values={mediaCoverageLinks} onChange={setMediaCoverageLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Website / project pages" placeholder="Paste a link" values={projectPageLinks} onChange={setProjectPageLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Annual reports" placeholder="Paste a link" values={annualReportLinks} onChange={setAnnualReportLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Impact reports" placeholder="Paste a link" values={impactReportLinks} onChange={setImpactReportLinks} {...linkProps} /></FieldGroup>
                  <FieldGroup><ChipListField dark label="Social media posts" placeholder="Paste a link" values={socialMediaPostLinks} onChange={setSocialMediaPostLinks} {...linkProps} /></FieldGroup>
                </Disclosure>
              </>
            )}

            {step === 'arthGoals' && (
              <>
                <FieldGroup name="arthUsageGoals">
                  <SelectField dark multi required layout="list" hint="Select all that apply" label="What would you like to use ARTH for?" options={ARTH_USAGE_OPTIONS} value={arthUsageGoals} onChange={setArthUsageGoals} />
                </FieldGroup>
                <FieldGroup>
                  <SelectField dark multi layout="grid" hint="Select all that apply" label="Who typically participates in your drives?" options={PARTICIPANT_TYPE_OPTIONS} value={participantTypes} onChange={setParticipantTypes} />
                </FieldGroup>
                <NgoField name="expectedDrivesPerYear" label="Expected drives per year via ARTH" optional maxLength={5} value={expectedDrivesPerYear} onChangeText={setExpectedDrivesPerYear} keyboardType="number-pad" />
              </>
            )}

            {step === 'account' && (
              <>
                <NgoField
                  required
                  name="email"
                  label="Email"
                  maxLength={254}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email.value}
                  onChangeText={email.setValue}
                  onBlur={() => email.setTouched(true)}
                  error={email.error || null}
                  hint={!email.error && email.checking ? 'Checking…' : undefined}
                />
                <FieldGroup name="password">
                  <FieldLabel label="Password" required dark />
                  <PasswordInput
                    inputStyle={styles.input}
                    maxLength={72}
                    placeholder="Password (min. 8 characters)"
                    placeholderTextColor={ON_DARK_SURFACE.muted}
                    value={password}
                    onChangeText={setPassword}
                  />
                </FieldGroup>
                <Text style={styles.helperNote}>Your application will be reviewed before you can publish drives, campaigns, or receive donations.</Text>
              </>
            )}
          </StepTransition>
          </FormErrorProvider>

          {error?.key === 'form' && <Text style={styles.errorBanner}>{error.message}</Text>}

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
    ...TEXT.title,
    color: COLORS.white,
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
    marginBottom: SPACING.lg,
  },
  card: {
    width: '100%',
    borderWidth: 0,
    padding: SPACING.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.lg },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  title: { ...TYPOGRAPHY.h1, fontSize: 22, color: COLORS.white },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.white, flex: 1 },
  helperNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: SPACING.md, lineHeight: 17 },
  errorBanner: {
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
