import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
// NOTE: expo-camera's barcode scanning (CameraView + barcodeScannerSettings) is a native module.
// It has historically needed a dev-client rebuild to work correctly inside plain Expo Go on this
// repo's SDK (see apps/mobile's Expo Go setup notes for reanimated/worklets needing exact pins) —
// if scanning doesn't fire in Expo Go, that's expected; test via a dev client build instead. The
// screen still renders and degrades to the manual-entry fallback below either way.
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { useSaplingUnit } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';

/** Pulls the unitId back out of a scanned `${WEB_PUBLIC_URL}/sapling/:unitId` QR (see
 * components/common/SaplingQrCode.tsx) — tolerant of trailing slashes/query strings. */
function extractUnitId(scannedValue: string): string | null {
  try {
    const cleaned = scannedValue.split('?')[0].replace(/\/+$/, '');
    const segments = cleaned.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last || null;
  } catch {
    return null;
  }
}

export function ScanSaplingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedUnitId, setScannedUnitId] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [scanLocked, setScanLocked] = useState(false);
  const { success, error: errorHaptic } = useHaptics();

  const { data: unit, isLoading, isError, refetch } = useSaplingUnit(scannedUnitId);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanLocked) return;
      const unitId = extractUnitId(result.data);
      if (!unitId) return;
      setScanLocked(true);
      setScannedUnitId(unitId);
    },
    [scanLocked],
  );

  const handleContinue = useCallback(() => {
    if (!unit || !unit.readyToPlant) return;
    success();
    navigation.replace('PlantTree', { lockedSpeciesId: unit.speciesId, sourceUnitId: unit.id });
  }, [unit, navigation, success]);

  const handleRescan = useCallback(() => {
    setScanLocked(false);
    setScannedUnitId(null);
  }, []);

  const handleManualSubmit = useCallback(() => {
    const unitId = extractUnitId(manualId.trim());
    if (!unitId) return;
    setScanLocked(true);
    setScannedUnitId(unitId);
  }, [manualId]);

  React.useEffect(() => {
    if (isError) errorHaptic();
  }, [isError, errorHaptic]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Scan a Sapling"
        subtitle="Point your camera at the QR code on the sapling's tag"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {!permission ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !permission.granted ? (
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            We need your camera to scan the QR code printed on the sapling's tag.
          </Text>
          <AnimatedButton label="Grant camera access" onPress={requestPermission} variant="primary" size="md" />
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
          />
          <View style={styles.scanFrame} pointerEvents="none" />
        </View>
      )}

      {scannedUnitId && (
        <View style={[styles.resultSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
          {isLoading ? (
            <View style={styles.resultLoading}>
              <ActivityIndicator color={COLORS.sage} />
              <Text style={styles.resultLoadingText}>Looking up this sapling…</Text>
            </View>
          ) : isError || !unit ? (
            <BorderCard style={styles.resultCard}>
              <Text style={styles.resultTitle}>Couldn't find this sapling</Text>
              <Text style={styles.resultBody}>That code doesn't match a sapling we know about. Try scanning again.</Text>
              <TouchableOpacity onPress={handleRescan} style={styles.rescanButton}>
                <Text style={styles.rescanText}>Scan again</Text>
              </TouchableOpacity>
            </BorderCard>
          ) : !unit.readyToPlant ? (
            <BorderCard style={styles.resultCard}>
              <Text style={styles.resultEmoji}>{unit.speciesEmoji}</Text>
              <Text style={styles.resultTitle}>{unit.speciesName} isn't ready yet</Text>
              <Text style={styles.resultBody}>
                {unit.alreadyPlanted
                  ? 'This sapling has already been planted.'
                  : `This sapling is still marked "${unit.status}" at ${unit.nurseryName} — it needs to be collected first.`}
              </Text>
              <TouchableOpacity onPress={handleRescan} style={styles.rescanButton}>
                <Text style={styles.rescanText}>Scan a different one</Text>
              </TouchableOpacity>
            </BorderCard>
          ) : (
            <BorderCard style={styles.resultCard}>
              <Text style={styles.resultEmoji}>{unit.speciesEmoji}</Text>
              <Text style={styles.resultTitle}>{unit.speciesName}</Text>
              <Text style={styles.resultBody}>
                From {unit.nurseryName}{unit.ageAtSupplyLabel ? ` · ${unit.ageAtSupplyLabel}` : ''}
              </Text>
              <AnimatedButton label="Plant this sapling" onPress={handleContinue} variant="primary" size="md" fullWidth style={{ marginTop: 8 }} />
              <TouchableOpacity onPress={handleRescan} style={styles.rescanButton}>
                <Text style={styles.rescanText}>Scan a different one</Text>
              </TouchableOpacity>
            </BorderCard>
          )}
        </View>
      )}

      {!scannedUnitId && (
        <View style={[styles.manualWrap, { paddingBottom: insets.bottom + SPACING.md }]}>
          <Text style={styles.manualLabel}>Can't scan? Enter the code manually.</Text>
          <View style={styles.manualRow}>
            <View style={{ flex: 1 }}>
              <FormField label="Sapling code" value={manualId} onChangeText={setManualId} placeholder="Paste the sapling link or ID" autoCapitalize="none" />
            </View>
            <TouchableOpacity onPress={handleManualSubmit} style={styles.manualButton} disabled={!manualId.trim()}>
              <Text style={styles.manualButtonText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.nightDeep },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  permissionIcon: { fontSize: 48 },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  permissionBody: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 8 },
  cameraWrap: { flex: 1, position: 'relative' },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    bottom: '35%',
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: COLORS.sageLight,
  },
  resultSheet: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, backgroundColor: COLORS.nightDeep },
  resultLoading: { alignItems: 'center', gap: 8, paddingVertical: SPACING.md },
  resultLoadingText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  resultCard: { backgroundColor: COLORS.cream, alignItems: 'center', gap: 4 },
  resultEmoji: { fontSize: 32 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  resultBody: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  rescanButton: { marginTop: 10, paddingVertical: 6 },
  rescanText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  manualWrap: { paddingHorizontal: SPACING.md, backgroundColor: COLORS.nightDeep },
  manualLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  manualRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  manualButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12 },
  manualButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
