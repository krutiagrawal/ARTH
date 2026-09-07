import React, { useState, useCallback } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { BlurCard } from '../components/common/GlassCard';
import { PasswordInput } from '../components/common/PasswordInput';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

const GROUP_TYPES: { value: 'family' | 'school' | 'club' | 'other'; label: string }[] = [
  { value: 'family', label: 'Family' },
  { value: 'school', label: 'School' },
  { value: 'club', label: 'Club' },
  { value: 'other', label: 'Other' },
];

function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'group';
}

export function GroupRegisterScreen({ navigation }: any) {
  const { registerGroup } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'family' | 'school' | 'club' | 'other'>('other');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!groupName.trim() || !description.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError('Fill in all required fields to continue');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerGroup({
        name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
        handle: slugifyHandle(groupName),
        groupName: groupName.trim(),
        groupType,
        description: description.trim(),
      });
      navigation.reset({ index: 0, routes: [{ name: 'GroupMain' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [groupName, groupType, description, ownerName, email, password, registerGroup, navigation]);

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
        <Text style={styles.tagline}>for families, schools & clubs</Text>

        <BlurCard tint="dark" intensity={40} style={styles.card}>
          <Text style={styles.title}>Register your group</Text>
          <Text style={styles.subtitle}>No review wait — you're live right away with a shareable invite code.</Text>

          <Text style={styles.sectionLabel}>Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={groupName}
            onChangeText={setGroupName}
          />
          <View style={styles.typeRow}>
            {GROUP_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setGroupType(t.value)}
                style={[styles.typeChip, groupType === t.value && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, groupType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What's your group about?"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.sectionLabel}>Your account</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={ownerName}
            onChangeText={setOwnerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PasswordInput
            inputStyle={styles.input}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={isSubmitting ? 'Creating...' : 'Create your group'}
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
              Not a group? <Text style={styles.switchLink}>Choose a different account type</Text>
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  typeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  typeChipActive: {
    backgroundColor: COLORS.mint,
    borderColor: COLORS.mint,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  typeChipTextActive: {
    color: COLORS.forestDeep,
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
    marginTop: SPACING.xs,
  },
  switchLink: {
    color: COLORS.mint,
    fontWeight: '700',
  },
});
