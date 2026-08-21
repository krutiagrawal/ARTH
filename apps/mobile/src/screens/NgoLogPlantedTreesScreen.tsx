import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { useMyDrives, useBulkCreatePlantedTrees } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

export function NgoLogPlantedTreesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: drives = [] } = useMyDrives();
  const bulkCreateMutation = useBulkCreatePlantedTrees();

  const [driveId, setDriveId] = useState<string | undefined>(undefined);
  const [speciesName, setSpeciesName] = useState('');
  const [count, setCount] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      Alert.alert('Logged', `${result.createdCount} trees logged as planted.`);
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not log these trees. Please try again.');
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
        <Text style={styles.headerTitle}>Log Planted Trees</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.hint}>Log how many trees were actually planted so you can track their survival over time.</Text>

          <Text style={styles.label}>Drive (optional)</Text>
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

          <Text style={styles.label}>Species</Text>
          <TextInput style={styles.input} value={speciesName} onChangeText={setSpeciesName} placeholder="Neem" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Number of trees</Text>
          <TextInput style={styles.input} value={count} onChangeText={(v: string) => setCount(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 100" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Location (optional)</Text>
          <TextInput style={styles.input} value={locationLabel} onChangeText={setLocationLabel} placeholder="Riverside plot" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Photo (optional)</Text>
          <PhotoPickerField photo={photo} onChange={setPhoto} mode="gallery" />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, bulkCreateMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={bulkCreateMutation.isPending}
          >
            {bulkCreateMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Log trees</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: 'rgba(13,35,24,0.45)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18, gap: 6 },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'transparent', maxWidth: 160 },
  chipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  chipTextSelected: { color: COLORS.white, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
