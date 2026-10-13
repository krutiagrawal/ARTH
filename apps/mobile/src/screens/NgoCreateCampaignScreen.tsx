import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { CAMPAIGN_CATEGORIES, type CampaignCategory } from '../api/donations';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useCreateCampaign } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function NgoCreateCampaignScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateCampaign();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalRupees, setGoalRupees] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [category, setCategory] = useState<CampaignCategory | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = durationDays ? Number(durationDays) : 0;

  const handleSubmit = async () => {
    setError(null);
    if (durationDays && (days < 1 || days > 365)) {
      setError('Duration must be between 1 and 365 days.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goalAmountCents: goalRupees ? Math.round(Number(goalRupees) * 100) : undefined,
        category: category ?? undefined,
        endsAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : undefined,
        photo: photo ?? undefined,
      });
      confirm('Campaign created', 'Your donation campaign is live.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this campaign. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="New Campaign"
        subtitle="Raise funds for your next planting push"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <View>
          <PhotoPickerField
            photo={photo}
            onChange={setPhoto}
            mode="gallery"
            label="Add Cover Photo"
            hint="Showcase your campaign"
          />

          <FormField maxLength={120}
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="eg - Plant 1,000 trees this monsoon"
          />

          <FormField maxLength={2000}
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="eg - What this campaign funds"
            multiline
          />

          <FormField
            label="Goal (₹, optional)"
            value={goalRupees}
            onChangeText={(v: string) => setGoalRupees(v.replace(/[^0-9]/g, ''))}
            placeholder="eg - No limit"
            keyboardType="number-pad"
          />

          <FormField
            label="Runs for (days, optional)"
            value={durationDays}
            onChangeText={(v: string) => setDurationDays(v.replace(/[^0-9]/g, '').slice(0, 3))}
            placeholder="eg - 30 (leave empty for no end date)"
            keyboardType="number-pad"
          />

          <Text style={styles.fieldLabel}>Category (optional)</Text>
          <View style={styles.chipRow}>
            {CAMPAIGN_CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setCategory(selected ? null : c.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.emoji} {c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={createMutation.isPending ? 'Publishing…' : 'Publish Campaign  →'}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            fullWidth
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.sage, backgroundColor: 'transparent' },
  chipSelected: { backgroundColor: COLORS.sage },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  chipTextSelected: { color: COLORS.white },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
