import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS, TEXT } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { MultiPhotoPickerField } from '../components/social/MultiPhotoPickerField';
import { StatusModal } from '../components/common/StatusModal';
import { CityPickerField } from '../components/common/CityPickerField';
import { resolveMediaUrl } from '../api/client';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import type { ApiPortfolioEntry } from '../api/portfolio';
import { useCreatePortfolioEntry, useUpdatePortfolioEntry } from '../hooks/useSocialQueries';
import { useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

/**
 * Create/edit a past-work entry.
 *
 * On edit, photos are only sent when the NGO actually picks new ones – the API replaces the whole
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
  // Pin from the picked suggestion. Typing over the label drops it, so a stale pin can't outlive
  // the text; the server then geocodes whatever was typed.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    existing?.lat != null && existing?.lng != null ? { lat: existing.lat, lng: existing.lng } : null,
  );
  const [city, setCity] = useState(existing?.city || 'Pune');
  const [treesPlanted, setTreesPlanted] = useState(
    existing?.treesPlanted != null ? String(existing.treesPlanted) : '',
  );
  const [volunteers, setVolunteers] = useState(
    existing?.volunteersInvolved != null ? String(existing.volunteersInvolved) : '',
  );
  const [partnerOrgs, setPartnerOrgs] = useState(existing?.partnerOrgs ?? '');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);

  const create = useCreatePortfolioEntry();
  const update = useUpdatePortfolioEntry();
  const busy = create.isPending || update.isPending;
  const confirm = useConfirm();
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh();

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
      // On edit, send '' so a field the user emptied is actually cleared on the server.
      description: isEdit ? description.trim() : description.trim() || undefined,
      happenedOn: happenedOn.toISOString(),
      locationLabel: isEdit ? locationLabel.trim() : locationLabel.trim() || undefined,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      city: isEdit ? city.trim() : city.trim() || undefined,
      treesPlanted: treesPlanted ? Number(treesPlanted) : undefined,
      volunteersInvolved: volunteers ? Number(volunteers) : undefined,
      partnerOrgs: isEdit ? partnerOrgs.trim() : partnerOrgs.trim() || undefined,
      // New photos are appended; stored ones the user removed are deleted by id.
      ...(photos.length > 0 ? { photos } : {}),
      ...(removedMediaIds.length > 0 ? { removeMediaIds: removedMediaIds } : {}),
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
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <FormField maxLength={160}
            required label="What was it?"
            placeholder="eg - Yamuna bank restoration"
            value={title}
            onChangeText={setTitle}
          />

          <FormFieldShell required label="When did it happen?">
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

          <FormField maxLength={4000}
            label="Story"
            placeholder="eg - What did you set out to do, and what changed?"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.sectionTitle}>Where</Text>
          <AddressSearchField
            label="Location"
            placeholder="eg - Yamuna Bank, near Metro Station"
            value={locationLabel}
            onChangeText={(text) => {
              setLocationLabel(text);
              setCoords(null);
            }}
            onSelectSuggestion={(s) => {
              setCoords({ lat: s.lat, lng: s.lng });
            }}
            allowCurrentLocation
          />
          <CityPickerField value={city} onChange={setCity} />

          <Text style={styles.sectionTitle}>Impact</Text>
          <Text style={styles.sectionHint}>
            Self-reported figures. They show on your profile as past work, kept separate from the
            survival rate you track through the app.
          </Text>
          <FormField
            label="Trees planted"
            placeholder="eg - 4200"
            value={treesPlanted}
            onChangeText={setTreesPlanted}
            keyboardType="number-pad"
          />
          <FormField
            label="Volunteers involved"
            placeholder="eg - 180"
            value={volunteers}
            onChangeText={setVolunteers}
            keyboardType="number-pad"
          />
          <FormField maxLength={500}
            label="Partners"
            placeholder="eg - Delhi Jal Board, local schools"
            value={partnerOrgs}
            onChangeText={setPartnerOrgs}
          />

          <Text style={styles.sectionTitle}>Photos</Text>
          <MultiPhotoPickerField
            photos={photos}
            onChange={setPhotos}
            existing={(existing?.media ?? []).filter((m) => !removedMediaIds.includes(m.id))}
            onRemoveExisting={(id) => setRemovedMediaIds((prev) => [...prev, id])}
            max={6}
            label="Up to 6 photos"
            hint={isEdit ? 'Saved photos stay unless you remove them; new ones are added after.' : 'The first photo becomes the cover.'}
          />

          <AnimatedButton
            label={busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add to profile'}
            onPress={guard(submit)}
            disabled={busy}
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusModal {...statusModalProps} />
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
    ...TEXT.heading,
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
