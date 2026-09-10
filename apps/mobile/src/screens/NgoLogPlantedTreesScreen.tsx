import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useSlideUp } from '../hooks/useAnimations';
import { useMyDrives, useBulkCreatePlantedTrees } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

export function NgoLogPlantedTreesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: drives = [] } = useMyDrives();
  const bulkCreateMutation = useBulkCreatePlantedTrees();
  const confirm = useConfirm();

  const [driveId, setDriveId] = useState<string | undefined>(undefined);
  const [speciesName, setSpeciesName] = useState('');
  const [count, setCount] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

  const handleSubmit = async () => {
    setError(null);
    if (!speciesName.trim() || !count || Number(count) < 1) {
      setError('Species and a valid count are required.');
      return;
    }
    try {
      const result = await bulkCreateMutation.mutateAsync({
        driveId,
        speciesName: speciesName.trim(),
        count: Number(count),
        locationLabel: locationLabel.trim() || undefined,
        photo: photo ?? undefined,
      });
      confirm('Logged', `${result.createdCount} trees logged as planted.`);
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not log these trees. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Log Planted Trees"
        subtitle="Record what actually went in the ground"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={cardAnim}>
          <Text style={styles.hint}>Log how many trees were actually planted so you can track their survival over time.</Text>

          <Text style={styles.sectionLabel}>Drive (optional)</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, !driveId && styles.chipSelected]} onPress={() => setDriveId(undefined)}>
              <Text style={[styles.chipText, !driveId && styles.chipTextSelected]}>None</Text>
            </TouchableOpacity>
            {drives.map((d) => (
              <TouchableOpacity key={d.id} style={[styles.chip, driveId === d.id && styles.chipSelected]} onPress={() => setDriveId(d.id)}>
                <Text style={[styles.chipText, driveId === d.id && styles.chipTextSelected]} numberOfLines={1}>{d.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormField
            label="Species"
            value={speciesName}
            onChangeText={setSpeciesName}
            placeholder="Neem"
          />

          <FormField
            label="Number of trees"
            value={count}
            onChangeText={(v: string) => setCount(v.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 100"
            keyboardType="number-pad"
          />

          <FormField
            label="Location (optional)"
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Riverside plot"
          />

          <PhotoPickerField
            photo={photo}
            onChange={setPhoto}
            mode="gallery"
            label="Add Photo"
            hint="Optional – show what you planted"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={bulkCreateMutation.isPending ? 'Logging…' : 'Log Trees  →'}
            onPress={handleSubmit}
            disabled={bulkCreateMutation.isPending}
            fullWidth
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submitButton}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.beige, borderWidth: 1.5, borderColor: 'transparent', maxWidth: 160 },
  chipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.forest, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
