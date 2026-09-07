import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useSetAdminCorporateStatus } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiAdminCorporate, NgoApprovalStatus } from '../api/admin';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';

function statusColor(status: string) {
  switch (status) {
    case 'approved':
      return COLORS.sageLight;
    case 'pending':
      return COLORS.amberLight;
    case 'rejected':
    case 'suspended':
      return COLORS.dangerLight;
    default:
      return ON_DARK_SURFACE.primary;
  }
}

export function AdminCorporateApprovalDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialCorporate: ApiAdminCorporate = route.params.corporate;
  const [corporate, setCorporate] = useState(initialCorporate);
  const setStatusMutation = useSetAdminCorporateStatus();

  const [reasonSheet, setReasonSheet] = useState<'rejected' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  const applyStatus = async (status: NgoApprovalStatus, rejectionReason?: string) => {
    setError(null);
    try {
      const updated = await setStatusMutation.mutateAsync({ id: corporate.id, status, rejectionReason });
      setCorporate(updated);
      setReasonSheet(null);
      setReason('');
      if (status === 'approved') navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this account. Please try again.');
    }
  };

  const openReasonSheet = (status: 'rejected' | 'suspended') => {
    setError(null);
    setReason('');
    setReasonSheet(status);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{corporate.companyName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <GlassCard variant="dark" style={styles.card}>
          <View style={[styles.statusChip, { borderColor: statusColor(corporate.status), alignSelf: 'flex-start' }]}>
            <Text style={[styles.statusChipText, { color: statusColor(corporate.status) }]}>{corporate.status}</Text>
          </View>
          <Text style={styles.description}>{corporate.description}</Text>

          {corporate.owner && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner</Text>
              <Text style={styles.infoValue}>{corporate.owner.name} · {corporate.owner.email}</Text>
            </View>
          )}
          {corporate.industry && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{corporate.industry}</Text>
            </View>
          )}
          {corporate.city && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{corporate.city}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Applied</Text>
            <Text style={styles.infoValue}>{new Date(corporate.createdAt).toLocaleDateString()}</Text>
          </View>
          {corporate.rejectionReason && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reason on file</Text>
              <Text style={styles.infoValue}>{corporate.rejectionReason}</Text>
            </View>
          )}
        </GlassCard>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {corporate.status !== 'approved' && (
            <AnimatedButton
              label={setStatusMutation.isPending ? 'Working…' : 'Approve'}
              onPress={() => applyStatus('approved')}
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {corporate.status !== 'rejected' && (
            <AnimatedButton
              label="Reject"
              onPress={() => openReasonSheet('rejected')}
              variant="danger"
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {corporate.status !== 'suspended' && corporate.status !== 'pending' && (
            <AnimatedButton
              label="Suspend"
              onPress={() => openReasonSheet('suspended')}
              variant="secondary"
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>

      <Sheet visible={reasonSheet !== null} onClose={() => setReasonSheet(null)} title={reasonSheet === 'rejected' ? 'Reject account' : 'Suspend account'}>
        <Text style={[styles.sheetLabel, isNightMode && styles.sheetLabelNight]}>Reason (optional)</Text>
        <TextInput
          style={[styles.sheetInput, isNightMode && styles.sheetInputNight]}
          value={reason}
          onChangeText={setReason}
          placeholder="Let them know why…"
          placeholderTextColor={isNightMode ? ON_DARK_SURFACE.muted : COLORS.textMuted}
          multiline
        />
        <AnimatedButton
          label={setStatusMutation.isPending ? 'Working…' : `Confirm ${reasonSheet === 'rejected' ? 'reject' : 'suspend'}`}
          onPress={() => reasonSheet && applyStatus(reasonSheet, reason.trim() || undefined)}
          variant="danger"
          disabled={setStatusMutation.isPending}
          fullWidth
          style={styles.sheetButton}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: ON_DARK_SURFACE.primary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 14 },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 14, color: ON_DARK_SURFACE.secondary, lineHeight: 20 },
  infoRow: { marginTop: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: ON_DARK_SURFACE.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: ON_DARK_SURFACE.primary, marginTop: 2 },
  error: { fontSize: 13, color: COLORS.dangerLight, marginBottom: 12 },
  actions: { gap: 10, marginTop: 4 },
  actionButton: {},
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  sheetButton: { marginTop: 16 },
  sheetLabelNight: { color: ON_DARK_SURFACE.secondary },
  sheetInputNight: { backgroundColor: 'rgba(255,255,255,0.08)', color: ON_DARK_SURFACE.primary },
});
