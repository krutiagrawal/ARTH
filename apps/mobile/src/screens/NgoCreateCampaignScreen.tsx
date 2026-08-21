import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { useCreateCampaign } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

export function NgoCreateCampaignScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateCampaign();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalRupees, setGoalRupees] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goalAmountCents: goalRupees ? Math.round(Number(goalRupees) * 100) : undefined,
        photo: photo ?? undefined,
      });
      Alert.alert('Campaign created', 'Your donation campaign is live.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this campaign. Please try again.');
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
        <Text style={styles.headerTitle}>New Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Cover photo</Text>
          <PhotoPickerField photo={photo} onChange={setPhoto} mode="gallery" />

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Plant 1,000 trees this monsoon" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholder="What this campaign funds" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Goal (₹, optional)</Text>
          <TextInput style={styles.input} value={goalRupees} onChangeText={(v: string) => setGoalRupees(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="No limit" placeholderTextColor="rgba(255,255,255,0.4)" />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Publish campaign</Text>}
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
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
