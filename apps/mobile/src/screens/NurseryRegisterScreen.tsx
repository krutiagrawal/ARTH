import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
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
import { isValidWebsite, isValidGstin } from '../utils/validation';

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

const STEPS = ['identity', 'location', 'person', 'stock', 'verification', 'photo', 'account'] as const;
type Step = (typeof STEPS)[number];

const STEP_COPY: Record<Step, { emoji: string; title: string; subtitle: string }> = {
  identity: { emoji: '🏪', title: 'Your nursery', subtitle: 'The basics — who you are and what kind of nursery you run.' },
  location: { emoji: '📍', title: 'Where are you', subtitle: 'So planters nearby can find you and get deliveries.' },
  person: { emoji: '👤', title: 'Point of contact', subtitle: "Who should we reach if there's a question about an order?" },
  stock: { emoji: '🌱', title: 'What do you stock', subtitle: 'Helps planters find you when they search for something specific.' },
  verification: { emoji: '📄', title: 'Verify your business', subtitle: "Optional — whichever of these apply to you speeds up approval." },
  photo: { emoji: '📸', title: 'Show us your nursery', subtitle: 'One real-time photo of your name board with plants visible behind it.' },
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

  // Photo
  const [verificationPhoto, setVerificationPhoto] = useState<PickedPhoto | null>(null);

  // Account
  const email = useEmailField();
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleVerificationFields = useMemo(() => verificationFieldsFor(nurseryType), [nurseryType]);

  const useCurrentLocation = async () => {
    setLocating(true);
    setError(null);
    setLocationNotice(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to place your nursery on the map.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ lat, lng });
      const found = await reverseGeocode(lat, lng).catch(() => null);
      if (found) {
        setLine1(found.label);
        setLocationNotice({ ok: true, text: '✓ Matched from GPS — check the address above is correct' });
      } else {
        setLocationNotice({ ok: false, text: "Pin captured, but we couldn't find an address for it — please type your address above" });
      }
    } catch {
      setError("Couldn't get your location. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleLine1Change = (text: string) => {
    setLine1(text);
    setLocationNotice(null);
  };

  const validateStep = (s: Step): string | null => {
    switch (s) {
      case 'identity':
        if (!nurseryName.trim()) return 'Enter your nursery name';
        if (!ownerName.trim()) return "Enter the owner's name";
        if (!description.trim()) return 'Tell us what your nursery grows';
        if (!nurseryType) return 'Pick the type that best describes your nursery';
        if (websiteUrl.trim() && !isValidWebsite(websiteUrl)) {
          setWebsiteTouched(true);
          return 'Enter a valid website URL';
        }
        return null;
      case 'location':
        if (!line1.trim()) return 'Add your nursery address';
        if (!contactPhone.value) {
          contactPhone.setTouched(true);
          return 'Add a contact number';
        }
        if (!contactPhone.valid) {
          contactPhone.setTouched(true);
          return 'Enter a valid 10-digit mobile number';
        }
        if (contactPhone.taken) return 'This phone number is already registered';
        return null;
      case 'person':
        if (!sameAsOwner && !personName.trim()) return "Enter the responsible person's name";
        if (!sameAsOwner) {
          if (!personPhone.value) {
            personPhone.setTouched(true);
            return "Enter the responsible person's phone";
          }
          if (!personPhone.valid) {
            personPhone.setTouched(true);
            return 'Enter a valid 10-digit mobile number';
          }
        }
        return null;
      case 'stock':
        if (plantCategories.length === 0) return 'Pick at least one category you stock';
        if (!approxPlantCount) return 'Pick roughly how many plants you have available';
        return null;
      case 'verification':
        if (gstin.trim() && !isValidGstin(gstin)) return 'Enter a valid GSTIN, or leave it blank';
        return null;
      case 'photo':
        if (!verificationPhoto) return 'A real-time photo of your nursery is required';
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
        gstin: gstin.trim() || undefined,
        businessRegistrationNumber: businessReg.trim() || undefined,
        tradeLicenseNumber: tradeLicense.trim() || undefined,
        ngoRegistrationNumber: ngoReg.trim() || undefined,
        governmentNurseryId: govId.trim() || undefined,
        verificationPhoto: verificationPhoto!,
      });
      navigation.reset({ index: 0, routes: [{ name: 'NurseryMain' }] });
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
        <Text style={styles.tagline}>for nurseries</Text>

        <StepDots current={stepIndex} />
        <Text style={styles.stepCounter}>Step {stepIndex + 1} of {STEPS.length}</Text>

        <BorderCard style={styles.card}>
          <Text style={styles.title}>{STEP_COPY[step].emoji} {STEP_COPY[step].title}</Text>
          <Text style={styles.subtitle}>{STEP_COPY[step].subtitle}</Text>

          {step === 'identity' && (
            <>
              <TextInput style={styles.input} placeholder="Nursery / business name" placeholderTextColor={ON_DARK_SURFACE.muted} value={nurseryName} onChangeText={setNurseryName} />
              <TextInput style={styles.input} placeholder="Owner / proprietor name" placeholderTextColor={ON_DARK_SURFACE.muted} value={ownerName} onChangeText={setOwnerName} />
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="What does your nursery grow?"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Year established (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                value={yearEstablished}
                onChangeText={setYearEstablished}
                keyboardType="number-pad"
                maxLength={4}
              />
              <SelectField dark label="Nursery type" options={NURSERY_TYPE_OPTIONS} value={nurseryType} onChange={(v) => setNurseryType(v as NurseryType)} />
              <TextInput
                style={styles.input}
                placeholder="Website / social media (optional)"
                placeholderTextColor={ON_DARK_SURFACE.muted}
                autoCapitalize="none"
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                onBlur={() => setWebsiteTouched(true)}
              />
              {websiteTouched && websiteUrl.trim() && !isValidWebsite(websiteUrl) && (
                <Text style={styles.fieldError}>Enter a valid website URL</Text>
              )}
            </>
          )}

          {step === 'location' && (
            <>
              <AddressSearchField
                dark
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
              <CityPickerField value={city} onChange={setCity} variant="dark" />
              <PhoneField
                dark
                label="Contact number"
                value={contactPhone.value}
                onChangeText={contactPhone.setValue}
                onBlur={() => contactPhone.setTouched(true)}
                error={
                  contactPhone.touched
                    ? contactPhone.error
                    : contactPhone.checking
                      ? 'Checking…'
                      : null
                }
              />
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
                  <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={ON_DARK_SURFACE.muted} value={personName} onChangeText={setPersonName} />
                  <SelectField dark label="Role" options={RESPONSIBLE_ROLE_OPTIONS} value={personRole} onChange={setPersonRole} />
                  <PhoneField
                    dark
                    label="Phone"
                    value={personPhone.value}
                    onChangeText={personPhone.setValue}
                    onBlur={() => personPhone.setTouched(true)}
                    error={personPhone.touched ? personPhone.error : personPhone.checking ? 'Checking…' : null}
                  />
                </>
              )}
            </>
          )}

          {step === 'stock' && (
            <>
              <SelectField dark multi label="What do you stock?" options={PLANT_CATEGORY_OPTIONS} value={plantCategories} onChange={setPlantCategories} />
              <SelectField dark label="Approximately how many plants do you have?" options={PLANT_COUNT_OPTIONS} value={approxPlantCount} onChange={setApproxPlantCount} />
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>🍂 Availability changes by season</Text>
                <Toggle value={seasonalAvailability} onValueChange={setSeasonalAvailability} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>📦 Can supply bulk quantities</Text>
                <Toggle value={bulkSupply} onValueChange={setBulkSupply} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
              </View>
            </>
          )}

          {step === 'verification' && (
            <>
              {visibleVerificationFields.includes('gstin') && (
                <>
                  <TextInput style={styles.input} placeholder="GSTIN (if applicable)" placeholderTextColor={ON_DARK_SURFACE.muted} autoCapitalize="characters" value={gstin} onChangeText={setGstin} />
                  {gstin.trim() && !isValidGstin(gstin) && <Text style={styles.fieldError}>Doesn't look like a valid GSTIN</Text>}
                </>
              )}
              {visibleVerificationFields.includes('businessReg') && (
                <TextInput style={styles.input} placeholder="Business registration / license (if applicable)" placeholderTextColor={ON_DARK_SURFACE.muted} value={businessReg} onChangeText={setBusinessReg} />
              )}
              {visibleVerificationFields.includes('tradeLicense') && (
                <TextInput style={styles.input} placeholder="Nursery / trade license (if applicable)" placeholderTextColor={ON_DARK_SURFACE.muted} value={tradeLicense} onChangeText={setTradeLicense} />
              )}
              {visibleVerificationFields.includes('ngoReg') && (
                <TextInput style={styles.input} placeholder="NGO registration number (if applicable)" placeholderTextColor={ON_DARK_SURFACE.muted} value={ngoReg} onChangeText={setNgoReg} />
              )}
              {visibleVerificationFields.includes('govId') && (
                <TextInput style={styles.input} placeholder="Government nursery ID (if applicable)" placeholderTextColor={ON_DARK_SURFACE.muted} value={govId} onChangeText={setGovId} />
              )}
              <Text style={styles.helperNote}>None of these are mandatory — add whichever you have to help us approve you faster.</Text>
            </>
          )}

          {step === 'photo' && (
            <>
              <PhotoPickerField
                dark
                mode="camera"
                photo={verificationPhoto}
                onChange={setVerificationPhoto}
                icon="📸"
                label="Capture your nursery"
                hint="Name board + plants visible behind it, taken live — no gallery uploads"
                aspect={[4, 3]}
              />
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
              <Text style={styles.helperNote}>Your account will be reviewed before your stock is visible to planters.</Text>
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
                label={step === 'account' ? (isSubmitting ? 'Creating account…' : '🌱 Create nursery account') : 'Continue →'}
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
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 6 },
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
  locationButton: { paddingVertical: 6, marginBottom: 4 },
  locationButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.mint },
  locationNotice: { fontSize: 12, lineHeight: 16, marginBottom: SPACING.sm },
  locationNoticeOk: { color: COLORS.mint },
  locationNoticeWarn: { color: COLORS.amberLight },
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
