import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { useLogCommunityObservation } from '../hooks/useApiQueries';
import { getCurrentPositionWithTimeout } from '../utils/location';
import { useHaptics } from '../hooks/useHaptics';
import { resolveMediaUrl } from '../api/client';
import { STATUS_META, ACTIONABLE_STATUSES } from '../constants/treeHealth';

const OBSERVATION_LOCATION_ACCURACY = Location.Accuracy.Highest;

type Stage = 'confirm' | 'status' | 'submitting' | 'success' | 'error';

export function LogCommunityObservationScreen({ navigation, route }: any) {
  const { kind, id, species, speciesEmoji, photoUrl, publicId } = route.params as {
    kind: 'tree' | 'planted-tree';
    id: string;
    species?: string;
    speciesEmoji?: string | null;
    photoUrl?: string | null;
    publicId?: string;
  };
  const insets = useSafeAreaInsets();
  const { medium, success: successHaptic } = useHaptics();
  const logMutation = useLogCommunityObservation();

  const [stage, setStage] = useState<Stage>('confirm');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);

  const handleConfirm = useCallback(async () => {
    medium();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('Location permission is required to log an observation.');
      setStage('error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop() || 'observation.jpg';
    const extension = filename.split('.').pop()?.toLowerCase();
    const type = extension === 'png' ? 'image/png' : 'image/jpeg';
    setCapturedPhoto({ uri, name: filename, type });
    setStage('status');
  }, [medium]);

  const handleSubmit = useCallback(
    async (healthStatus: (typeof ACTIONABLE_STATUSES)[number]) => {
      if (!capturedPhoto) return;
      setStage('submitting');

      // Always a fresh fix right now, same convention as PlantTreeScreen's submit-time read —
      // whatever ambient location the nearby list used to sort by is never reused here.
      let freshPosition;
      try {
        freshPosition = await getCurrentPositionWithTimeout({ accuracy: OBSERVATION_LOCATION_ACCURACY });
      } catch {
        setErrorMessage("Couldn't get your current location. Please try again.");
        setStage('error');
        return;
      }

      try {
        await logMutation.mutateAsync({
          targetKind: kind,
          targetId: id,
          status: healthStatus,
          lat: freshPosition.coords.latitude,
          lng: freshPosition.coords.longitude,
          accuracy: freshPosition.coords.accuracy ?? 9999,
          mocked: freshPosition.mocked ?? false,
          photo: capturedPhoto,
        });
        successHaptic();
        setStage('success');
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Could not submit your observation. Please try again.');
        setStage('error');
      }
    },
    [capturedPhoto, kind, id, logMutation, successHaptic],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Observation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {stage === 'confirm' ? (
          <>
            {photoUrl ? (
              <Image source={{ uri: resolveMediaUrl(photoUrl) }} style={styles.heroPhoto} />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroPlaceholderEmoji}>{speciesEmoji ?? '🌳'}</Text>
              </View>
            )}
            <Text style={styles.confirmTitle}>Is this the tree you're looking at?</Text>
            <Text style={styles.confirmSpecies}>{speciesEmoji ? `${speciesEmoji} ` : ''}{species ?? 'ARTH tree'}</Text>
            {publicId ? <Text style={styles.confirmPublicId}>ARTH #{publicId}</Text> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
              <Text style={styles.primaryButtonText}>Yes, this is it — take a photo</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {stage === 'status' ? (
          <>
            <Text style={styles.confirmTitle}>How does it look?</Text>
            <View style={styles.statusGrid}>
              {ACTIONABLE_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.markButton, { borderColor: STATUS_META[status].color }]}
                  onPress={() => handleSubmit(status)}
                >
                  <Text style={styles.markButtonText}>{STATUS_META[status].emoji} {STATUS_META[status].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {stage === 'submitting' ? (
          <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
        ) : null}

        {stage === 'success' ? (
          <BorderCard style={styles.successCard}>
            <Text style={styles.successTitle}>Observation confirmed ✓</Text>
            <Text style={styles.successBody}>
              {species ?? 'This tree'}{publicId ? ` #${publicId}` : ''}
            </Text>
            <Text style={styles.successSub}>Your observation was added to its story.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.replace('TreePassport', { kind, id })}
            >
              <Text style={styles.primaryButtonText}>View Tree Passport</Text>
            </TouchableOpacity>
          </BorderCard>
        ) : null}

        {stage === 'error' ? (
          <BorderCard style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStage('confirm')}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </BorderCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, alignItems: 'center' },
  heroPhoto: { width: '100%', height: 200, borderRadius: RADIUS.lg, marginBottom: 16 },
  heroPlaceholder: { width: '100%', height: 200, borderRadius: RADIUS.lg, marginBottom: 16, backgroundColor: COLORS.beigeLight, alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderEmoji: { fontSize: 56 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 },
  confirmSpecies: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  confirmPublicId: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  primaryButton: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: RADIUS.md, backgroundColor: COLORS.sage },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.cream },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  markButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.full, borderWidth: 1.5, backgroundColor: 'transparent' },
  markButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  successCard: { width: '100%', alignItems: 'center', gap: 6 },
  successTitle: { fontSize: 18, fontWeight: '800', color: COLORS.sage },
  successBody: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  successSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  errorCard: { width: '100%', alignItems: 'center', gap: 6 },
  errorText: { fontSize: 13, color: COLORS.danger, textAlign: 'center' },
});
