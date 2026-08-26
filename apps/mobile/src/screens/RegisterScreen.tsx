import React, { useState, useCallback } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BlurCard } from '../components/common/GlassCard';
import { PasswordInput } from '../components/common/PasswordInput';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

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
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in all fields to continue');
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
  }, [name, email, password, register, navigation]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>ARTH</Text>
        <Text style={styles.tagline}>grow your world</Text>

        <BlurCard tint="dark" intensity={40} style={styles.card}>
          <Text style={styles.title}>Create your forest</Text>

          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.55)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PasswordInput
            inputStyle={styles.input}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor="rgba(255,255,255,0.55)"
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
        </BlurCard>
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
