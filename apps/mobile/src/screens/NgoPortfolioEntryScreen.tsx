import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { MultiPhotoPickerField } from '../components/social/MultiPhotoPickerField';
import { resolveMediaUrl } from '../api/client';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import type { ApiPortfolioEntry } from '../api/portfolio';
import { useCreatePortfolioEntry, useUpdatePortfolioEntry } from '../hooks/useSocialQueries';
import { useConfirm } from '../context/ConfirmDialogContext';

/**
 * Create/edit a past-work entry.
 *
 * On edit, photos are only sent when the NGO actually picks new ones — the API replaces the whole
 * set when `photos` is present, so submitting an empty array would silently wipe existing images.
 * That's why `photos` starts empty and `replacePhotos` gates the field.
 */
export function NgoPortfolioEntryScreen({ navigation, route }: any) {
  const existing: ApiPortfolioEntry | undefined = route?.params?.entry;
  const isEdit = Boolean(existing);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [happenedOn, setHappenedOn] = useState<Date>(
    existing ? new Date(existing.happenedOn) : new Date(),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [locationLabel, setLocationLabel] = useState(existing?.locationLabel ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [treesPlanted, setTreesPlanted] = useState(
    existing?.treesPlanted != null ? String(existing.treesPlanted) : '',
  );
  const [volunteers, setVolunteers] = useState(
    existing?.volunteersInvolved != null ? String(existing.volunteersInvolved) : '',
  );
  const [partnerOrgs, setPartnerOrgs] = useState(existing?.partnerOrgs ?? '');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [replacePhotos, setReplacePhotos] = useState(!isEdit);

  const create = useCreatePortfolioEntry();
  const update = useUpdatePortfolioEntry();
  const busy = create.isPending || update.isPending;
  const confirm = useConfirm();

  const submit = () => {
    if (!title.trim()) {
      confirm('Add a title', 'Give this project a short name so people know what it was.');
      return;
    }
    if (happenedOn.getTime() > Date.now()) {
      confirm(
        'Pick a date in the past',
        'Past work is for drives you have already run. Use Manage → Drives to publish an upcoming one.',
      );
      return;
    }

    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      happenedOn: happenedOn.toISOString(),
      locationLabel: locationLabel.trim() || undefined,
      city: city.trim() || undefined,
      treesPlanted: treesPlanted ? Number(treesPlanted) : undefined,
      volunteersInvolved: volunteers ? Number(volunteers) : undefined,
      partnerOrgs: partnerOrgs.trim() || undefined,
      // Only sent when the user chose new images — see the note above.
      ...(replacePhotos && photos.length > 0 ? { photos } : {}),
    };

    const onDone = () => navigation.goBack();
    const onFail = (error: any) =>
      confirm('Could not save', error?.message ?? 'Please try again.');

    if (isEdit) {
      update.mutate({ id: existing!.id, input }, { onSuccess: onDone, onError: onFail });
    } else {
      create.mutate(input as any, { onSuccess: onDone, onError: onFail });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title={isEdit ? 'Edit past work' : 'Add past work'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FormField
            label="What was it?"
            placeholder="Yamuna bank restoration"
            value={title}
            onChangeText={setTitle}
          />

          <FormFieldShell label="When did it happen?">
            <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7}>
              <Text style={styles.dateValue}>
                {happenedOn.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </FormFieldShell>

          {showPicker && (
            <DateTimePicker
              value={happenedOn}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, date) => {
                // Android's dialog dismisses itself; iOS's spinner stays until told otherwise.
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (date) setHappenedOn(date);
              }}
            />
          )}
          {Platform.OS === 'ios' && showPicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}

          <FormField
            label="Story"
            placeholder="What did you set out to do, and what changed?"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.sectionTitle}>Where</Text>
          <FormField
            label="Location"
            placeholder="Yamuna Bank, near Metro Station"
            value={locationLabel}
            onChangeText={setLocationLabel}
          />
          <FormField label="City" placeholder="Delhi" value={city} onChangeText={setCity} />

          <Text style={styles.sectionTitle}>Impact</Text>
          <Text style={styles.sectionHint}>
            Self-reported figures. They show on your profile as past work, kept separate from the
            survival rate you track through the app.
          </Text>
          <FormField
            label="Trees planted"
            placeholder="4200"
            value={treesPlanted}
            onChangeText={setTreesPlanted}
            keyboardType="number-pad"
          />
          <FormField
            label="Volunteers involved"
            placeholder="180"
            value={volunteers}
            onChangeText={setVolunteers}
            keyboardType="number-pad"
          />
          <FormField
            label="Partners"
            placeholder="Delhi Jal Board, local schools"
            value={partnerOrgs}
            onChangeText={setPartnerOrgs}
          />

          <Text style={styles.sectionTitle}>Photos</Text>
          {isEdit && !replacePhotos ? (
            <View style={styles.existingPhotos}>
              <Text style={styles.existingText}>
                {existing!.media.length > 0
                  ? `${existing!.media.length} photo${existing!.media.length === 1 ? '' : 's'} already attached.`
                  : 'No photos attached yet.'}
              </Text>
              <TouchableOpacity onPress={() => setReplacePhotos(true)} activeOpacity={0.7}>
                <Text style={styles.replaceLink}>
                  {existing!.media.length > 0 ? 'Replace photos' : 'Add photos'} →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MultiPhotoPickerField
              photos={photos}
              onChange={setPhotos}
              max={6}
              label="Up to 6 photos"
              hint={
                isEdit
                  ? 'These replace the photos currently on this entry.'
                  : 'The first photo becomes the cover.'
              }
            />
          )}

          <AnimatedButton
            label={busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add to profile'}
            onPress={submit}
            disabled={busy}
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  form: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: 12 },
  dateValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600', paddingVertical: 2 },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6 },
  doneText: { fontSize: 14, fontWeight: '800', color: COLORS.forest },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  sectionHint: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, marginTop: -6 },
  existingPhotos: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
  },
  existingText: { fontSize: 13, color: COLORS.textSecondary },
  replaceLink: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  submit: { marginTop: SPACING.lg },
});
