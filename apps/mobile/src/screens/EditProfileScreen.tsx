import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, LayoutAnimation } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  useUpdateMe,
  usePersonalizeMe,
  useUploadAvatar,
  useRemoveAvatar,
  useSettings,
  useUpdateSettings,
} from '../hooks/useApiQueries';
import { ApiError, resolveMediaUrl } from '../api/client';
import { BorderCard } from '../components/common/BorderCard';
import { Toggle } from '../components/common/Toggle';
import { assetToPhoto } from '../components/common/PhotoPickerField';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAvailabilityCheck } from '../hooks/useAvailabilityCheck';
import type { PersonalizeInput } from '../api/users';
import type { ApiUserSettings } from '../api/settings';
import {
  SPACE_OPTIONS,
  SUNLIGHT_OPTIONS,
  EXPERIENCE_OPTIONS,
  SPECIES_OPTIONS,
  MOTIVATION_OPTIONS,
  type PersonalizeOption,
} from '../constants/personalization';

import { TEXT } from '../constants/typography';
const HANDLE_REGEX = /^[a-z0-9_]+$/;
const NAME_CHARS = /[^\p{L}\p{M} .'’-]/gu;
const NAME_REGEX = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
const CITY_CHARS = /[^\p{L}\p{M} .,'’-]/gu;
const CITY_REGEX = /^\p{L}[\p{L}\p{M} .,'’-]*$/u;
const MIN_BIRTH_YEAR = 1900;
const MIN_AGE_YEARS = 5;
const MAX_GOAL = 10000;

// Each validator returns an error message, or null when the value is fine. They run on every
// keystroke, so the user sees what is wrong while typing instead of after pressing Save.
function validateName(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return 'Name is required.';
  if (v.length < 2) return 'Name must be at least 2 characters.';
  if (!NAME_REGEX.test(v)) return 'Name must start with a letter and use only letters, spaces, . - or ’.';
  return null;
}

function validateCity(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return null; // optional
  if (v.length < 2) return 'City must be at least 2 characters.';
  if (!CITY_REGEX.test(v)) return 'City must start with a letter and use only letters, spaces, commas, . - or ’.';
  return null;
}

function validateGoal(value: string): string | null {
  if (value === '') return null; // optional
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 'Goal must be at least 1 tree.';
  if (n > MAX_GOAL) return `Goal can not be more than ${MAX_GOAL.toLocaleString()} trees.`;
  return null;
}

function validateDob(value: Date | null): string | null {
  if (!value) return null; // optional
  const now = new Date();
  if (value.getTime() > now.getTime()) return 'Birthday can not be in the future.';
  if (value.getFullYear() < MIN_BIRTH_YEAR) return `Birth year must be ${MIN_BIRTH_YEAR} or later.`;
  const cutoff = new Date(now.getFullYear() - MIN_AGE_YEARS, now.getMonth(), now.getDate());
  if (value.getTime() > cutoff.getTime()) return `You must be at least ${MIN_AGE_YEARS} years old.`;
  return null;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>⚠️ {message}</Text>;
}

/** One gardening-profile question as a compact row: the question and the current answer on one
 * line, with the choices tucked away until the row is tapped. `multi` toggles values in a list,
 * otherwise tapping picks a single value (tapping it again clears it). */
function QuestionRow({
  icon,
  title,
  options,
  selected,
  multi,
  open,
  onToggleOpen,
  onChange,
  last,
}: {
  icon: string;
  title: string;
  options: PersonalizeOption[];
  selected: string[];
  multi?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (next: string[]) => void;
  last?: boolean;
}) {
  const chosen = options.filter((o) => selected.includes(o.value));
  const summary =
    chosen.length === 0
      ? 'Not set'
      : chosen.length <= 2
        ? chosen.map((o) => o.label).join(', ')
        : `${chosen[0].label} +${chosen.length - 1} more`;
  return (
    <View style={[styles.qRow, !last && styles.qRowBorder]}>
      <TouchableOpacity style={styles.qHeader} activeOpacity={0.7} onPress={onToggleOpen}>
        <Text style={styles.qIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.qTitle}>{title}</Text>
          <Text style={[styles.qSummary, chosen.length === 0 && styles.qSummaryEmpty]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Text style={[styles.qChevron, open && styles.qChevronOpen]}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.qOptions}>
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <TouchableOpacity
                key={o.value}
                style={styles.qOption}
                activeOpacity={0.7}
                onPress={() => {
                  if (multi) onChange(active ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
                  else {
                    onChange(active ? [] : [o.value]);
                    onToggleOpen();
                  }
                }}
              >
                <Text style={styles.qOptionIcon}>{o.icon}</Text>
                <Text style={[styles.qOptionText, active && styles.qOptionTextActive]}>{o.label}</Text>
                <View style={[multi ? styles.qBox : styles.qRadio, active && styles.qMarkActive]}>
                  {active && <Text style={styles.qTick}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PrivacyRow({
  icon,
  label,
  sublabel,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.privacyRow}>
      <Text style={styles.privacyIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.privacyLabel}>{label}</Text>
        <Text style={styles.privacySub}>{sublabel}</Text>
      </View>
      <Toggle value={value} onValueChange={onToggle} offColor={COLORS.sand} onColor={COLORS.sage} />
    </View>
  );
}

export function EditProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const updateMeMutation = useUpdateMe();
  const personalizeMutation = usePersonalizeMe();
  const uploadAvatarMutation = useUploadAvatar();
  const removeAvatarMutation = useRemoveAvatar();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh();

  const [name, setName] = useState(user?.name ?? '');
  const [handle, setHandle] = useState(user?.handle ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji ?? '🧑‍🌾');
  const [experience, setExperience] = useState<string[]>(user?.gardeningExperience ? [user.gardeningExperience] : []);
  const [space, setSpace] = useState<string[]>(user?.plantingSpace ?? []);
  const [sunlight, setSunlight] = useState<string[]>(user?.homeSunlight ? [user.homeSunlight] : []);
  const [species, setSpecies] = useState<string[]>(user?.speciesInterest ?? []);
  const [motivation, setMotivation] = useState<string[]>(user?.motivation ?? []);
  const [goal, setGoal] = useState(user?.plantingGoal ? String(user.plantingGoal) : '');
  const [dob, setDob] = useState<Date | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  // Only one gardening question is expanded at a time, to keep the section short.
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const toggleQuestion = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenQuestion((cur) => (cur === key ? null : key));
  };
  const [error, setError] = useState<string | null>(null);

  // Live validation: every error below is recomputed on each keystroke.
  const nameError = validateName(name);
  const handleFormatError =
    handle.length === 0
      ? 'Handle is required.'
      : handle.length < 3
        ? 'Handle must be at least 3 characters.'
        : !HANDLE_REGEX.test(handle)
          ? 'Use only lowercase letters, numbers and underscores.'
          : null;
  // Own current handle always reads as "taken" to the availability endpoint, so skip it.
  const handleChanged = handle !== (user?.handle ?? '');
  const { checking: handleChecking, taken: handleTaken } = useAvailabilityCheck(
    'handle',
    handle,
    !handleFormatError && handleChanged,
  );
  const handleError = handleFormatError ?? (handleTaken ? 'This handle is already taken.' : null);
  const cityError = validateCity(city);
  const goalError = validateGoal(goal);
  const dobError = validateDob(dob);
  const hasErrors = !!(nameError || handleError || cityError || goalError || dobError);
  const canSave = !hasErrors && !handleChecking;

  const avatarUrl = resolveMediaUrl(user?.avatarUrl);
  // Date of birth is private and, once set, can not be changed here.
  const dobLocked = !!user?.dateOfBirth;
  const photoBusy = uploadAvatarMutation.isPending || removeAvatarMutation.isPending;
  const saving = updateMeMutation.isPending || personalizeMutation.isPending;

  const pickPhoto = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      await uploadAvatarMutation.mutateAsync(assetToPhoto(result.assets[0]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload your photo. Please try again.');
    }
  };

  const removePhoto = async () => {
    setError(null);
    try {
      await removeAvatarMutation.mutateAsync();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove your photo. Please try again.');
    }
  };

  const toggleSetting = (key: 'publicProfile' | 'showCity' | 'showStats' | 'showInterests') => {
    if (!settings) return;
    updateSettings.mutate({ [key]: !settings[key] } as Partial<ApiUserSettings>);
  };

  const handleSubmit = async () => {
    setError(null);
    // The Save button is disabled while any field is invalid; this is only a safety net.
    if (!canSave) return;
    const goalNumber = goal.trim() === '' ? undefined : Number(goal);
    try {
      await updateMeMutation.mutateAsync({
        name: name.trim(),
        handle,
        avatarEmoji,
        bio: bio.trim() || null,
        city: city.trim() || null,
      });
      const personalize: PersonalizeInput = {
        plantingSpace: space as PersonalizeInput['plantingSpace'],
        motivation: motivation as PersonalizeInput['motivation'],
        speciesInterest: species as PersonalizeInput['speciesInterest'],
        ...(experience[0] ? { gardeningExperience: experience[0] as PersonalizeInput['gardeningExperience'] } : {}),
        ...(sunlight[0] ? { homeSunlight: sunlight[0] as PersonalizeInput['homeSunlight'] } : {}),
        ...(goalNumber !== undefined ? { plantingGoal: goalNumber } : {}),
        ...(dob && !dobLocked ? { dateOfBirth: dob.toISOString() } : {}),
      };
      await personalizeMutation.mutateAsync(personalize);
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
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={() => navigation?.navigate('Settings')} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <BorderCard>
          <Text style={styles.sectionTitle}>Photo</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoAvatar} onPress={pickPhoto} disabled={photoBusy} activeOpacity={0.8}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoEmoji}>{avatarEmoji}</Text>
              )}
              {photoBusy && (
                <View style={styles.photoBusy}>
                  <ActivityIndicator color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhoto} disabled={photoBusy}>
                <Text style={styles.photoButtonText}>{avatarUrl ? 'Change photo' : '📷  Upload a photo'}</Text>
              </TouchableOpacity>
              {avatarUrl ? (
                <TouchableOpacity onPress={removePhoto} disabled={photoBusy}>
                  <Text style={styles.photoLink}>Remove photo</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => navigation.navigate('EmojiPicker', { selected: avatarEmoji, onSelect: setAvatarEmoji })}
                >
                  <Text style={styles.photoLink}>or choose an emoji</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {avatarUrl ? (
            <TouchableOpacity
              style={styles.avatarPicker}
              onPress={() => navigation.navigate('EmojiPicker', { selected: avatarEmoji, onSelect: setAvatarEmoji })}
            >
              <Text style={styles.avatarPickerEmoji}>{avatarEmoji}</Text>
              <Text style={styles.avatarPickerHint}>Fallback emoji (used if you remove your photo)</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.sectionTitle}>Basics</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputInvalid]}
            value={name}
            onChangeText={(text) => setName(text.replace(NAME_CHARS, '').replace(/^\s+/, ''))}
            placeholder="eg - Your name"
            placeholderTextColor={COLORS.textLight}
            maxLength={60}
          />
          <FieldError message={nameError} />

          <Text style={styles.label}>Handle</Text>
          <TextInput
            style={[styles.input, handleError && styles.inputInvalid]}
            value={handle}
            onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="eg - your_handle"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
          <FieldError message={handleError} />
          {!handleError && handleChanged && (
            <Text style={handleChecking ? styles.fieldHint : styles.fieldOk}>
              {handleChecking ? 'Checking availability…' : '✓ Handle is available'}
            </Text>
          )}

          <Text style={styles.label}>City</Text>
          <TextInput
            style={[styles.input, cityError && styles.inputInvalid]}
            value={city}
            onChangeText={(text) => setCity(text.replace(CITY_CHARS, '').replace(/^\s+/, ''))}
            placeholder="eg - Pune"
            placeholderTextColor={COLORS.textLight}
            maxLength={100}
          />
          <FieldError message={cityError} />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Bio</Text>
            <Text style={[styles.charCount, bio.length >= 160 && styles.charCountMax]}>{bio.length}/160</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, 160))}
            placeholder="eg - Tell people a bit about yourself"
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={160}
          />
        </BorderCard>

        <BorderCard style={styles.section}>
          <Text style={styles.sectionTitle}>Your gardening profile</Text>
          <Text style={styles.sectionHint}>Helps friends find common ground and keeps your recommendations relevant.</Text>

          <View style={styles.qList}>
            <QuestionRow
              icon="🌱"
              title="Experience"
              options={EXPERIENCE_OPTIONS}
              selected={experience}
              open={openQuestion === 'experience'}
              onToggleOpen={() => toggleQuestion('experience')}
              onChange={setExperience}
            />
            <QuestionRow
              icon="🏡"
              title="Where you plant"
              options={SPACE_OPTIONS}
              selected={space}
              multi
              open={openQuestion === 'space'}
              onToggleOpen={() => toggleQuestion('space')}
              onChange={setSpace}
            />
            <QuestionRow
              icon="☀️"
              title="Sunlight at your spot"
              options={SUNLIGHT_OPTIONS}
              selected={sunlight}
              open={openQuestion === 'sunlight'}
              onToggleOpen={() => toggleQuestion('sunlight')}
              onChange={setSunlight}
            />
            <QuestionRow
              icon="🌳"
              title="Trees you love"
              options={SPECIES_OPTIONS}
              selected={species}
              multi
              open={openQuestion === 'species'}
              onToggleOpen={() => toggleQuestion('species')}
              onChange={setSpecies}
            />
            <QuestionRow
              icon="💚"
              title="Why you are here"
              options={MOTIVATION_OPTIONS}
              selected={motivation}
              multi
              open={openQuestion === 'motivation'}
              onToggleOpen={() => toggleQuestion('motivation')}
              onChange={setMotivation}
              last
            />
          </View>

          <Text style={styles.label}>Planting goal this year</Text>
          <TextInput
            style={[styles.input, goalError && styles.inputInvalid]}
            value={goal}
            // Digits only, no leading zeros (so "007" can not be typed).
            onChangeText={(text) => setGoal(text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, ''))}
            placeholder="eg - 50 trees"
            placeholderTextColor={COLORS.textLight}
            keyboardType="number-pad"
            maxLength={5}
          />
          <FieldError message={goalError} />

          <Text style={styles.label}>Birthday</Text>
          {dobLocked ? (
            <Text style={styles.dobLocked}>
              🎂 {new Date(user!.dateOfBirth!).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              {'  '}· private, cannot be changed
            </Text>
          ) : (
            <>
              <TouchableOpacity style={[styles.input, dobError && styles.inputInvalid]} onPress={() => setDateOpen(true)}>
                <Text style={dob ? styles.dobText : styles.dobPlaceholder}>
                  {dob ? dob.toLocaleDateString() : 'Select a date (private)'}
                </Text>
              </TouchableOpacity>
              <FieldError message={dobError} />
              {dateOpen && (
                <DateTimePicker
                  value={dob ?? new Date(2000, 0, 1)}
                  mode="date"
                  minimumDate={new Date(MIN_BIRTH_YEAR, 0, 1)}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setDateOpen(false);
                    if (date) setDob(date);
                  }}
                />
              )}
            </>
          )}
        </BorderCard>

        <BorderCard style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.sectionHint}>Choose what other people see on your profile.</Text>
          {settings ? (
            <>
              <PrivacyRow
                icon="👁️"
                label="Public profile"
                sublabel="Let others see your forest and posts"
                value={settings.publicProfile}
                onToggle={() => toggleSetting('publicProfile')}
              />
              <PrivacyRow
                icon="📍"
                label="Show my city"
                sublabel="Appears under your name"
                value={settings.showCity}
                onToggle={() => toggleSetting('showCity')}
              />
              <PrivacyRow
                icon="📊"
                label="Show my stats"
                sublabel="Trees, streak, badges and planting goal"
                value={settings.showStats}
                onToggle={() => toggleSetting('showStats')}
              />
              <PrivacyRow
                icon="🌿"
                label="Show my interests"
                sublabel="Experience level and favourite trees"
                value={settings.showInterests}
                onToggle={() => toggleSetting('showInterests')}
              />
            </>
          ) : (
            <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 16 }} />
          )}
        </BorderCard>

        {error && <Text style={styles.error}>{error}</Text>}
        {hasErrors && <Text style={styles.fixHint}>Fix the highlighted fields to save your changes.</Text>}

        <TouchableOpacity
          style={[styles.submitButton, (saving || !canSave) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving || !canSave}
        >
          {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Save Changes</Text>}
        </TouchableOpacity>
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
    backgroundColor: 'transparent',
  },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  settingsIcon: { fontSize: 18 },
  headerTitle: {
    ...TEXT.heading,
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 16 },
  inputInvalid: { borderColor: COLORS.coral },
  fieldError: { fontSize: 12, fontWeight: '600', color: COLORS.coral, marginTop: 4 },
  fieldHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  fieldOk: { fontSize: 12, fontWeight: '600', color: COLORS.sageDark, marginTop: 4 },
  charCountMax: { color: COLORS.coral, fontWeight: '700' },
  fixHint: { fontSize: 12, color: COLORS.coral, textAlign: 'center', marginTop: 12 },
  section: { marginTop: 16 },
  sectionTitle: { ...TEXT.subheading, color: COLORS.textPrimary, marginTop: 8 },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  photoAvatar: { width: 88, height: 88, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoImage: { width: 88, height: 88 },
  photoEmoji: { fontSize: 44 },
  photoBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  photoActions: { flex: 1, gap: 10, alignItems: 'flex-start' },
  photoButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.full, backgroundColor: COLORS.sageDark },
  photoButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  photoLink: { fontSize: 13, fontWeight: '700', color: COLORS.sageDark },
  qList: { marginTop: 8 },
  qRow: { paddingVertical: 2 },
  qRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(160,114,74,0.25)' },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  qIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  qTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  qSummary: { fontSize: 12, fontWeight: '600', color: COLORS.sageDark, marginTop: 1 },
  qSummaryEmpty: { color: COLORS.textMuted, fontWeight: '500' },
  qChevron: { fontSize: 14, color: COLORS.textSecondary },
  qChevronOpen: { transform: [{ rotate: '180deg' }] },
  qOptions: { paddingBottom: 8, paddingLeft: 38 },
  qOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  qOptionIcon: { fontSize: 16 },
  qOptionText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  qOptionTextActive: { fontWeight: '800', color: COLORS.sageDark },
  qBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  qRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  qMarkActive: { backgroundColor: COLORS.sageDark, borderColor: COLORS.sageDark },
  qTick: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  dobText: { fontSize: 15, color: COLORS.textPrimary },
  dobPlaceholder: { fontSize: 15, color: COLORS.textLight },
  dobLocked: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  privacyIcon: { fontSize: 20 },
  privacyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  privacySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
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
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  avatarPickerEmoji: {
    fontSize: 32,
    width: 52,
    height: 52,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    overflow: 'hidden',
  },
  avatarPickerHint: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
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
