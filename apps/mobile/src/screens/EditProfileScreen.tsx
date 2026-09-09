import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useUpdateMe } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { GlassCard } from '../components/common/GlassCard';
import { useConfirm } from '../context/ConfirmDialogContext';

const AVATAR_OPTIONS = [
  '🧑‍🌾', '🌱', '🌳', '🌲', '🍃', '🌿', '🌸', '🌻',
  '🦋', '🐝', '🐿️', '🦔', '🌍', '🌎', '🌏', '💚',
];

const HANDLE_REGEX = /^[a-z0-9_]+$/;

export function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const updateMeMutation = useUpdateMe();
  const confirm = useConfirm();

  const [name, setName] = useState(user?.name ?? '');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji ?? '🧑‍🌾');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length === 0) {
      setError('Name cannot be empty.');
      return;
    }
    if (handle.length < 3 || !HANDLE_REGEX.test(handle)) {
      setError('Handle must be at least 3 characters — lowercase letters, numbers, and underscores only.');
      return;
    }
    try {
      await updateMeMutation.mutateAsync({ name: name.trim(), handle, avatarEmoji, bio: bio.trim() || null });
      confirm('Profile updated', 'Your changes have been saved.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update your profile. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard variant="warm">
          <Text style={styles.label}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.avatarChip, avatarEmoji === emoji && styles.avatarChipSelected]}
                onPress={() => setAvatarEmoji(emoji)}
              >
                <Text style={styles.avatarChipEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
            maxLength={60}
          />

          <Text style={styles.label}>Handle</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="your_handle"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            maxLength={30}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, 160))}
            placeholder="Tell people a bit about yourself"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={160}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, updateMeMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={updateMeMutation.isPending}
          >
            {updateMeMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40 },
  backBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  bioInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  avatarChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.beige,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatarChipSelected: {
    borderColor: COLORS.sage,
    backgroundColor: 'rgba(135,168,120,0.25)',
  },
  avatarChipEmoji: { fontSize: 22 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    color: COLORS.coral,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
