import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { FieldLabel } from '../components/common/RequiredMark';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
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
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { PhoneField } from '../components/common/PhoneField';
import { Toggle } from '../components/common/Toggle';
import { useAuth } from '../context/AuthContext';
import type { NurseryType } from '../api/auth';
import { ApiError } from '../api/client';
import { reverseGeocode } from '../api/geocode';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useEmailField } from '../hooks/useEmailField';
import { usePhoneField } from '../hooks/usePhoneField';
import { isValidWebsite, isValidGstin, isValidYear } from '../utils/validation';

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'nursery';
}

const NURSERY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'retail', label: 'Retail nursery', icon: '🏬' },
  { value: 'wholesale', label: 'Wholesale nursery', icon: '📦' },
  { value: 'native_plant', label: 'Native plant nursery', icon: '🌿' },
  { value: 'government', label: 'Government nursery', icon: '🏛️' },
  { value: 'ngo_community', label: 'NGO / community nursery', icon: '🤝' },
  { value: 'landscaping', label: 'Landscaping nursery', icon: '🎍' },
  { value: 'other', label: 'Other', icon: '➕' },
];

const PLANT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'native', label: 'Native species', icon: '🌿' },
  { value: 'fruit', label: 'Fruit trees', icon: '🍎' },
  { value: 'ornamental', label: 'Ornamental plants', icon: '🌸' },
  { value: 'medicinal', label: 'Medicinal plants', icon: '🌱' },
  { value: 'large_trees', label: 'Large trees / saplings', icon: '🌳' },
];

const PLANT_COUNT_OPTIONS: SelectOption[] = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_200', label: '50 – 200' },
  { value: '200_500', label: '200 – 500' },
  { value: '500_plus', label: '500+' },
];

const RESPONSIBLE_ROLE_OPTIONS: SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'other', label: 'Other' },
];

type VerificationField = 'gstin' | 'businessReg' | 'tradeLicense' | 'ngoReg' | 'govId';

function verificationFieldsFor(type: NurseryType | null): VerificationField[] {
  switch (type) {
    case 'retail':
    case 'wholesale':
    case 'landscaping':
      return ['gstin', 'businessReg'];
    case 'native_plant':
      return ['gstin', 'tradeLicense'];
    case 'government':
      return ['govId'];
    case 'ngo_community':
      return ['ngoReg'];
    default:
      return ['gstin', 'businessReg', 'tradeLicense', 'ngoReg', 'govId'];
  }
}

type StepError = { key: string; message: string };

const VERIFICATION_META: Record<VerificationField, { icon: string; title: string; description: string; label: string }> = {
  gstin: { icon: '🧾', title: 'GSTIN', description: 'Goods and services tax registration', label: 'GSTIN' },
  businessReg: { icon: '📜', title: 'Business registration', description: 'Shop / business registration or license', label: 'Registration / license number' },
  tradeLicense: { icon: '🌿', title: 'Nursery / trade license', description: 'Issued for running a plant nursery', label: 'License number' },
  ngoReg: { icon: '🤝', title: 'NGO registration', description: 'For NGO / community nurseries', label: 'NGO registration number' },
  govId: { icon: '🏛️', title: 'Government nursery ID', description: 'For government-run nurseries', label: 'Nursery ID' },
};

const STEPS = ['identity', 'location', 'person', 'stock', 'verification', 'photo', 'account'] as const;
type Step = (typeof STEPS)[number];

// Steps whose answers become read-only registration details once the account is created (the
// Edit profile screen only lets a nursery change its name, address, phone and delivery settings).
const LOCKED_STEPS: Step[] = ['identity', 'person', 'stock', 'verification', 'photo', 'account'];

const STEP_COPY: Record<Step, { emoji: string; title: string; subtitle: string }> = {
  identity: { emoji: '🏪', title: 'Your nursery', subtitle: 'The basics – who you are and what kind of nursery you run.' },
  location: { emoji: '📍', title: 'Where are you', subtitle: 'So planters nearby can find you and get deliveries.' },
  person: { emoji: '👤', title: 'Point of contact', subtitle: "Who should we reach if there's a question about an order?" },
  stock: { emoji: '🌱', title: 'What do you stock', subtitle: 'Helps planters find you when they search for something specific.' },
  verification: { emoji: '📄', title: 'Verify your business', subtitle: "Optional – whichever of these apply to you speeds up approval." },
  photo: { emoji: '📸', title: 'Show us your nursery', subtitle: 'One real-time photo of your name board with plants visible behind it.' },
  account: { emoji: '🔐', title: 'Create your login', subtitle: "Last step – you're almost in." },
};

export function NurseryRegisterScreen({ navigation }: any) {
  const { registerNursery } = useAuth();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  // Identity
  const [nurseryName, setNurseryName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');
  const [yearEstablished, setYearEstablished] = useState('');
  const [nurseryType, setNurseryType] = useState<NurseryType | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);

  // Location
  const [line1, setLine1] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [city, setCity] = useState('Pune');
  const contactPhone = usePhoneField('', true);

  // Responsible person
  const [sameAsOwner, setSameAsOwner] = useState(true);
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState<string | null>('owner');
  const personPhone = usePhoneField('', true);

  // Stock
  const [plantCategories, setPlantCategories] = useState<string[]>([]);
  const [approxPlantCount, setApproxPlantCount] = useState<string | null>(null);
  const [seasonalAvailability, setSeasonalAvailability] = useState(false);
  const [bulkSupply, setBulkSupply] = useState(false);

  // Verification (all optional)
  const [gstin, setGstin] = useState('');
  const [businessReg, setBusinessReg] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [ngoReg, setNgoReg] = useState('');
  const [govId, setGovId] = useState('');
  const [verificationOn, setVerificationOn] = useState<Record<VerificationField, boolean>>({
    gstin: false, businessReg: false, tradeLicense: false, ngoReg: false, govId: false,
  });

  // Photo
  const [verificationPhoto, setVerificationPhoto] = useState<PickedPhoto | null>(null);

  // Account
  const email = useEmailField();
  const [password, setPassword] = useState('');

  const [error, setError] = useState<(StepError & { id: number }) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const showError = (e: StepError) => setError({ ...e, id: Date.now() });
  const fail = (key: string, message: string): StepError => ({ key, message });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bring the offending field into view: its on-screen y plus the current scroll offset.
  const scrollToView = useCallback((view: View) => {
    view.measureInWindow((_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + y - 140), animated: true });
    });
  }, []);

  const visibleVerificationFields = useMemo(() => verificationFieldsFor(nurseryType), [nurseryType]);

  const useCurrentLocation = async () => {
    setLocating(true);
    setError(null);
    setLocationNotice(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError(fail('form', 'Location permission is needed to place your nursery on the map.'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ lat, lng });
      const found = await reverseGeocode(lat, lng).catch(() => null);
      if (found) {
        setLine1(found.label);
        setLocationNotice({ ok: true, text: '✓ Matched from GPS – check the address above is correct' });
      } else {
        setLocationNotice({ ok: false, text: "Pin captured, but we couldn't find an address for it – please type your address above" });
      }
    } catch {
      showError(fail('form', "Couldn't get your location. Please try again."));
    } finally {
      setLocating(false);
    }
  };

  const handleLine1Change = (text: string) => {
    setLine1(text);
    setLocationNotice(null);
  };

  const validateStep = (s: Step): StepError | null => {
    switch (s) {
      case 'identity':
        if (!nurseryName.trim()) return fail('nurseryName', 'Enter your nursery name');
        if (!ownerName.trim()) return fail('ownerName', "Enter the owner's name");
        if (!description.trim()) return fail('description', 'Tell us what your nursery grows');
        if (!nurseryType) return fail('nurseryType', 'Pick the type that best describes your nursery');
        if (yearEstablished.trim() && !isValidYear(yearEstablished)) {
          return fail('yearEstablished', `Enter a valid 4-digit year (1800–${new Date().getFullYear()})`);
        }
        if (websiteUrl.trim() && !isValidWebsite(websiteUrl)) {
          setWebsiteTouched(true);
          return fail('websiteUrl', 'Enter a valid website URL');
        }
        return null;
      case 'location':
        if (!line1.trim()) return fail('line1', 'Add your nursery address');
        if (!contactPhone.value) return fail('contactPhone', 'Add a contact number');
        if (!contactPhone.valid) return fail('contactPhone', 'Enter a valid 10-digit mobile number');
        if (contactPhone.taken) return fail('contactPhone', 'This phone number is already registered');
        return null;
      case 'person':
        if (!sameAsOwner && !personName.trim()) return fail('personName', "Enter the responsible person's name");
        if (!sameAsOwner) {
          if (!personPhone.value) return fail('personPhone', "Enter the responsible person's phone");
          if (!personPhone.valid) return fail('personPhone', 'Enter a valid 10-digit mobile number');
        }
        return null;
      case 'stock':
        if (plantCategories.length === 0) return fail('plantCategories', 'Pick at least one category you stock');
        if (!approxPlantCount) return fail('approxPlantCount', 'Pick roughly how many plants you have available');
        return null;
      case 'verification':
        if (visibleVerificationFields.includes('gstin') && verificationOn.gstin && gstin.trim() && !isValidGstin(gstin)) {
          return fail('gstin', 'Enter a valid GSTIN, or leave it blank');
        }
        return null;
      case 'photo':
        if (!verificationPhoto) return fail('verificationPhoto', 'A real-time photo of your nursery is required');
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

  const verificationValue = (field: VerificationField, value: string) =>
    visibleVerificationFields.includes(field) && verificationOn[field] ? value.trim() || undefined : undefined;

  const handleRegister = async () => {
    const failure = validateStep('account');
    if (failure) {
      showError(failure);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await registerNursery({
        name: ownerName.trim(),
        email: email.value.trim().toLowerCase(),
        password,
        handle: slugifyHandle(nurseryName),
        nurseryName: nurseryName.trim(),
        description: description.trim(),
        city: city.trim() || undefined,
        contactPhone: contactPhone.value,
        line1: line1.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
        yearEstablished: yearEstablished.trim() ? Number(yearEstablished.trim()) : undefined,
        nurseryType: nurseryType as NurseryType,
        websiteUrl: websiteUrl.trim() || undefined,
        responsiblePersonName: sameAsOwner ? ownerName.trim() : personName.trim(),
        responsiblePersonRole: sameAsOwner ? 'Owner' : RESPONSIBLE_ROLE_OPTIONS.find((o) => o.value === personRole)?.label,
        responsiblePersonPhone: sameAsOwner ? contactPhone.value : personPhone.value,
        plantCategories,
        approxPlantCount: PLANT_COUNT_OPTIONS.find((o) => o.value === approxPlantCount)?.label,
        seasonalAvailability,
        bulkSupply,
        gstin: verificationValue('gstin', gstin),
        businessRegistrationNumber: verificationValue('businessReg', businessReg),
        tradeLicenseNumber: verificationValue('tradeLicense', tradeLicense),
        ngoRegistrationNumber: verificationValue('ngoReg', ngoReg),
        governmentNurseryId: verificationValue('govId', govId),
        verificationPhoto: verificationPhoto!,
      });
      navigation.reset({ index: 0, routes: [{ name: 'NurseryMain' }] });
    } catch (e) {
      showError(fail('form', e instanceof ApiError ? e.message : 'Something went wrong. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMore = error?.key === 'websiteUrl' || error?.key === 'yearEstablished';

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
        <Text style={styles.tagline}>for nurseries</Text>

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
            {LOCKED_STEPS.includes(step) && (
              <View style={styles.lockNotice}>
                <Text style={styles.lockIcon}>⚠️</Text>
                <Text style={styles.lockText}>
                  {step === 'account'
                    ? "Last check – the details you entered earlier can't be edited after you register."
                    : "Please enter these details carefully – they can't be edited after you register."}
                </Text>
              </View>
            )}
            {step === 'identity' && (
              <>
                <NgoField required name="nurseryName" label="Nursery / business name" placeholder="e.g. Green Leaf Nursery" maxLength={120} value={nurseryName} onChangeText={setNurseryName} />
                <NgoField required name="ownerName" label="Owner / proprietor name" maxLength={60} value={ownerName} onChangeText={setOwnerName} />
                <NgoField required name="description" label="What does your nursery grow?" placeholder="Tell planters what you grow and sell" maxLength={2000} multiline value={description} onChangeText={setDescription} />
                <FieldGroup name="nurseryType">
                  <SelectField dark required layout="list" label="Nursery type" options={NURSERY_TYPE_OPTIONS} value={nurseryType} onChange={(v) => setNurseryType(v as NurseryType)} />
                </FieldGroup>

                <Disclosure title="More about your nursery" subtitle="Year established, website or social media" forceOpen={openMore}>
                  <NgoField name="yearEstablished" label="Year established" optional placeholder="e.g. 2012" value={yearEstablished} onChangeText={setYearEstablished} keyboardType="number-pad" maxLength={4} />
                  <NgoField
                    name="websiteUrl"
                    label="Website / social media"
                    optional
                    placeholder="https://"
                    maxLength={300}
                    autoCapitalize="none"
                    value={websiteUrl}
                    onChangeText={setWebsiteUrl}
                    onBlur={() => setWebsiteTouched(true)}
                    error={websiteTouched && websiteUrl.trim() && !isValidWebsite(websiteUrl) ? 'Enter a valid website URL' : null}
                  />
                </Disclosure>
              </>
            )}

            {step === 'location' && (
              <>
                <FieldGroup name="line1">
                  <AddressSearchField
                    dark
                    required
                    label="Full nursery address"
                    value={line1}
                    onChangeText={handleLine1Change}
                    placeholder="Street / area / landmark"
                    onSelectSuggestion={(s) => {
                      setLine1(s.label);
                      setLocationNotice(null);
                    }}
                  />
                  <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
                    <Text style={styles.locationButtonText}>{locating ? 'Locating…' : '📍 Or use my current location'}</Text>
                  </TouchableOpacity>
                  {locationNotice && (
                    <Text style={[styles.locationNotice, locationNotice.ok ? styles.locationNoticeOk : styles.locationNoticeWarn]}>
                      {locationNotice.text}
                    </Text>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <CityPickerField value={city} onChange={setCity} variant="dark" />
                </FieldGroup>
                <FieldGroup name="contactPhone">
                  <PhoneField
                    dark
                    required
                    label="Contact number"
                    value={contactPhone.value}
                    onChangeText={contactPhone.setValue}
                    onBlur={() => contactPhone.setTouched(true)}
                    error={contactPhone.checking ? 'Checking…' : null}
                  />
                </FieldGroup>
              </>
            )}

            {step === 'person' && (
              <>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Same as owner above</Text>
                    <Text style={styles.toggleHint}>{ownerName.trim() || 'The owner'} handles order queries</Text>
                  </View>
                  <Toggle value={sameAsOwner} onValueChange={setSameAsOwner} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
                </View>
                {!sameAsOwner && (
                  <>
                    <NgoField required name="personName" label="Full name" maxLength={120} value={personName} onChangeText={setPersonName} />
                    <FieldGroup>
                      <SelectField dark layout="grid" label="Role" options={RESPONSIBLE_ROLE_OPTIONS} value={personRole} onChange={setPersonRole} />
                    </FieldGroup>
                    <FieldGroup name="personPhone">
                      <PhoneField
                        dark
                        required
                        label="Phone"
                        value={personPhone.value}
                        onChangeText={personPhone.setValue}
                        onBlur={() => personPhone.setTouched(true)}
                        error={personPhone.checking ? 'Checking…' : null}
                      />
                    </FieldGroup>
                  </>
                )}
              </>
            )}

            {step === 'stock' && (
              <>
                <FieldGroup name="plantCategories">
                  <SelectField dark multi required layout="list" hint="Select all that apply" label="What do you stock?" options={PLANT_CATEGORY_OPTIONS} value={plantCategories} onChange={setPlantCategories} />
                </FieldGroup>
                <FieldGroup name="approxPlantCount">
                  <SelectField dark required layout="grid" label="Approximately how many plants do you have?" options={PLANT_COUNT_OPTIONS} value={approxPlantCount} onChange={setApproxPlantCount} />
                </FieldGroup>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>🍂 Availability changes by season</Text>
                  </View>
                  <Toggle value={seasonalAvailability} onValueChange={setSeasonalAvailability} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
                </View>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>📦 Can supply bulk quantities</Text>
                  </View>
                  <Toggle value={bulkSupply} onValueChange={setBulkSupply} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
                </View>
              </>
            )}

            {step === 'verification' && (
              <>
                {visibleVerificationFields.map((field) => {
                  const meta = VERIFICATION_META[field];
                  const value = { gstin, businessReg, tradeLicense, ngoReg, govId }[field];
                  const setValue = { gstin: setGstin, businessReg: setBusinessReg, tradeLicense: setTradeLicense, ngoReg: setNgoReg, govId: setGovId }[field];
                  return (
                    <RegistrationCard
                      key={field}
                      icon={meta.icon}
                      title={meta.title}
                      description={meta.description}
                      value={verificationOn[field]}
                      onValueChange={(v) => setVerificationOn((prev) => ({ ...prev, [field]: v }))}
                    >
                      <FieldGroup name={field === 'gstin' ? 'gstin' : undefined}>
                        <NgoField
                          label={meta.label}
                          maxLength={field === 'gstin' ? 15 : 60}
                          autoCapitalize="characters"
                          value={value}
                          onChangeText={(t) => setValue(field === 'gstin' ? t.toUpperCase() : t)}
                          error={field === 'gstin' && gstin.trim() && !isValidGstin(gstin) ? "Doesn't look like a valid GSTIN" : null}
                        />
                      </FieldGroup>
                    </RegistrationCard>
                  );
                })}
                <Text style={styles.helperNote}>None of these are mandatory – adding what you have helps us approve you faster.</Text>
              </>
            )}

            {step === 'photo' && (
              <FieldGroup name="verificationPhoto">
                <PhotoPickerField
                  dark
                  required
                  mode="camera"
                  photo={verificationPhoto}
                  onChange={setVerificationPhoto}
                  icon="📸"
                  label="Capture your nursery"
                  hint="Name board + plants visible behind it, taken live – no gallery uploads"
                  aspect={[4, 3]}
                />
              </FieldGroup>
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
                <Text style={styles.helperNote}>Your account will be reviewed before your stock is visible to planters.</Text>
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
                label={step === 'account' ? (isSubmitting ? 'Creating account…' : '🌱 Create account') : 'Continue →'}
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
                  Not a nursery? <Text style={styles.switchLink}>Choose a different account type</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BorderCard>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: SPACING.md,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
  },
  locationButton: { paddingVertical: 6, marginBottom: 4 },
  locationButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.mint },
  locationNotice: { fontSize: 12, lineHeight: 16, marginBottom: SPACING.sm },
  locationNoticeOk: { color: COLORS.mint },
  locationNoticeWarn: { color: COLORS.amberLight },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(232,184,75,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(232,184,75,0.45)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  lockIcon: { fontSize: 14 },
  lockText: { flex: 1, fontSize: 12, lineHeight: 17, color: COLORS.white, fontWeight: '600' },
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
  toggleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  toggleHint: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  helperNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, marginBottom: SPACING.sm, lineHeight: 17 },
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
