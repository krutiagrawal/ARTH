import React, { useState, useCallback } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { PasswordInput } from '../components/common/PasswordInput';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useEmailField } from '../hooks/useEmailField';
import { usePhoneField } from '../hooks/usePhoneField';
import { PhoneField } from '../components/common/PhoneField';
import { isValidWebsite } from '../utils/validation';

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'ngo';
}

export function NgoRegisterScreen({ navigation }: any) {
  const { registerNgo } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const phone = usePhoneField('', false);
  const [adminName, setAdminName] = useState('');
  const email = useEmailField();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshing, onRefresh } = usePullToRefresh();

  const websiteError = websiteTouched && website.trim() && !isValidWebsite(website) ? 'Enter a valid website URL' : null;

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!orgName.trim() || !description.trim() || !adminName.trim() || !email.value.trim() || !password) {
      setError('Fill in all required fields to continue');
      return;
    }
    if (!email.valid) {
      email.setTouched(true);
      setError('Enter a valid email address');
      return;
    }
    if (email.taken) {
      setError('This email is already registered');
      return;
    }
    if (website.trim() && !isValidWebsite(website)) {
      setWebsiteTouched(true);
      setError('Enter a valid website URL');
      return;
    }
    if (!phone.isOk) {
      phone.setTouched(true);
      setError(phone.taken ? 'This phone number is already registered' : 'Enter a valid 10-digit mobile number');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerNgo({
        name: adminName.trim(),
        email: email.value.trim().toLowerCase(),
        password,
        handle: slugifyHandle(orgName),
        orgName: orgName.trim(),
        description: description.trim(),
        website: website.trim() || undefined,
        contactPhone: phone.value || undefined,
      });
      navigation.reset({ index: 0, routes: [{ name: 'NgoMain' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [orgName, description, website, phone, adminName, email, password, registerNgo, navigation]);

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

        <BorderCard style={styles.card}>
          <Text style={styles.title}>Register your NGO</Text>
          <Text style={styles.subtitle}>
            Your account will be reviewed before you can publish drives or campaigns.
          </Text>

          <Text style={styles.sectionLabel}>Organization</Text>
          <TextInput
            style={styles.input}
            placeholder="Organization name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={orgName}
            onChangeText={setOrgName}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What does your organization do?"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Website (optional)"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            autoCapitalize="none"
            keyboardType="url"
            value={website}
            onChangeText={setWebsite}
            onBlur={() => setWebsiteTouched(true)}
          />
          {websiteError && <Text style={styles.fieldError}>{websiteError}</Text>}
          <PhoneField
            dark
            label="Contact phone (optional)"
            value={phone.value}
            onChangeText={phone.setValue}
            onBlur={() => phone.setTouched(true)}
            error={phone.touched ? phone.error : phone.checking ? 'Checking…' : null}
          />

          <Text style={styles.sectionLabel}>Your account</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={adminName}
            onChangeText={setAdminName}
          />
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
            <Text style={styles.fieldHint}>Checking…</Text>
          ) : null}
          <PasswordInput
            inputStyle={styles.input}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={isSubmitting ? 'Submitting...' : 'Register NGO'}
            onPress={handleRegister}
            disabled={isSubmitting}
            fullWidth
            style={styles.submitButton}
          />

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
    marginBottom: SPACING.xxl,
  },
  card: {
    width: '100%',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
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
  error: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.coral,
    marginBottom: SPACING.sm,
  },
  fieldError: { fontSize: 12, color: COLORS.coral, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  fieldHint: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  submitButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  switchText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  switchLink: {
    color: COLORS.mint,
    fontWeight: '700',
  },
});
