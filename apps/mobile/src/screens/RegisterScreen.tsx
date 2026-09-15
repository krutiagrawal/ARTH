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
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAvailabilityCheck } from '../hooks/useAvailabilityCheck';
import { ApiError } from '../api/client';
import { isValidEmail } from '../utils/validation';

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'planter';
}

export function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshing, onRefresh } = usePullToRefresh();

  const emailValid = isValidEmail(email);
  const emailAvailability = useAvailabilityCheck('email', email.trim().toLowerCase(), emailValid);
  const emailError = emailTouched && email.trim() && !emailValid
    ? 'Enter a valid email address'
    : emailAvailability.taken
      ? 'This email is already registered'
      : null;

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in all fields to continue');
      return;
    }
    if (!emailValid) {
      setEmailTouched(true);
      setError('Enter a valid email address');
      return;
    }
    if (emailAvailability.taken) {
      setError('This email is already registered');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        handle: slugifyHandle(name),
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, emailValid, emailAvailability.taken, password, register, navigation]);

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
        <Text style={styles.tagline}>Leave More Than Footprints</Text>

        <BorderCard style={styles.card}>
          <Text style={styles.title}>Create your forest</Text>

          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmailTouched(true)}
          />
          {emailError ? (
            <Text style={styles.fieldError}>{emailError}</Text>
          ) : emailAvailability.checking ? (
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
            label={isSubmitting ? 'Creating account...' : "Let's Plant"}
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
              Not an individual? <Text style={styles.switchLink}>Choose a different account type</Text>
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
    borderWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginBottom: SPACING.lg,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  },
  switchLink: {
    color: COLORS.mint,
    fontWeight: '700',
  },
});
