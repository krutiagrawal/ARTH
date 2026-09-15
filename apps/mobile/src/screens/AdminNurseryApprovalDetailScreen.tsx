import React, { useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useAdminNursery, useSetAdminNurseryStatus } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ApiError, resolveMediaUrl } from '../api/client';
import type { ApiAdminNursery, NgoApprovalStatus } from '../api/admin';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';

const NURSERY_TYPE_LABELS: Record<string, string> = {
  retail: 'Retail nursery',
  wholesale: 'Wholesale nursery',
  native_plant: 'Native plant nursery',
  government: 'Government nursery',
  ngo_community: 'NGO / community nursery',
  landscaping: 'Landscaping nursery',
  other: 'Other',
};

const PLANT_CATEGORY_LABELS: Record<string, string> = {
  native: 'Native species',
  fruit: 'Fruit trees',
  ornamental: 'Ornamental plants',
  medicinal: 'Medicinal plants',
  large_trees: 'Large trees / saplings',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

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

export function AdminNurseryApprovalDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialNursery: ApiAdminNursery = route.params.nursery;
  const [nursery, setNursery] = useState<ApiAdminNursery>(initialNursery);
  const detailQuery = useAdminNursery(initialNursery.id);
  const nurseryDetail = detailQuery.data;
  const setStatusMutation = useSetAdminNurseryStatus();

  const [reasonSheet, setReasonSheet] = useState<'rejected' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);
  const { refreshing, onRefresh } = usePullToRefresh(detailQuery.refetch);

  // Merge: the full detail fetch is the source of truth once it lands, but the list-row object
  // passed via route params keeps the header/status usable while that request is in flight.
  const d: ApiAdminNursery & Partial<Record<string, any>> = { ...nursery, ...(nurseryDetail ?? {}) };

  const applyStatus = async (status: NgoApprovalStatus, rejectionReason?: string) => {
    setError(null);
    try {
      const updated = await setStatusMutation.mutateAsync({ id: nursery.id, status, rejectionReason });
      setNursery(updated);
      setReasonSheet(null);
      setReason('');
      if (status === 'approved') navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this nursery. Please try again.');
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
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{nursery.nurseryName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <BorderCard style={styles.card}>
          <View style={[styles.statusChip, { borderColor: statusColor(nursery.status), alignSelf: 'flex-start' }]}>
            <Text style={[styles.statusChipText, { color: statusColor(nursery.status) }]}>{nursery.status}</Text>
          </View>
          <Text style={styles.description}>{d.description}</Text>

          <InfoRow label="Owner" value={d.owner ? `${d.owner.name} · ${d.owner.email}` : null} />
          <InfoRow label="Applied" value={new Date(nursery.createdAt).toLocaleDateString()} />
          <InfoRow label="Reason on file" value={d.rejectionReason} />

          {detailQuery.isLoading && !nurseryDetail && <Text style={styles.loadingText}>Loading full application…</Text>}
        </BorderCard>

        {d.verificationPhotoUrl && (
          <BorderCard style={styles.card}>
            <SectionLabel>Verification photo</SectionLabel>
            <Image source={{ uri: resolveMediaUrl(d.verificationPhotoUrl) }} style={styles.verificationPhoto} resizeMode="cover" />
          </BorderCard>
        )}

        <BorderCard style={styles.card}>
          <SectionLabel>Identity</SectionLabel>
          <InfoRow label="Nursery type" value={NURSERY_TYPE_LABELS[d.nurseryType] || d.nurseryType} />
          <InfoRow label="Year established" value={d.yearEstablished} />
          <InfoRow label="Website" value={d.websiteUrl} />
        </BorderCard>

        <BorderCard style={styles.card}>
          <SectionLabel>Location & contact</SectionLabel>
          <InfoRow label="Address" value={d.line1} />
          <InfoRow label="City" value={d.city} />
          <InfoRow label="Coordinates" value={d.lat != null && d.lng != null ? `${d.lat}, ${d.lng}` : null} />
          <InfoRow label="Contact phone" value={d.contactPhone ? `+91 ${d.contactPhone}` : null} />
        </BorderCard>

        {(d.responsiblePersonName || d.responsiblePersonPhone) && (
          <BorderCard style={styles.card}>
            <SectionLabel>Responsible person</SectionLabel>
            <InfoRow label="Name" value={d.responsiblePersonName} />
            <InfoRow label="Role" value={d.responsiblePersonRole} />
            <InfoRow label="Phone" value={d.responsiblePersonPhone ? `+91 ${d.responsiblePersonPhone}` : null} />
          </BorderCard>
        )}

        <BorderCard style={styles.card}>
          <SectionLabel>Stock</SectionLabel>
          {d.plantCategories?.length > 0 && (
            <View style={styles.chipRow}>
              {d.plantCategories.map((c: string) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{PLANT_CATEGORY_LABELS[c] || c}</Text>
                </View>
              ))}
            </View>
          )}
          <InfoRow label="Approx. quantity available" value={d.approxPlantCount} />
          <InfoRow label="Seasonal availability" value={d.seasonalAvailability == null ? null : d.seasonalAvailability ? 'Yes' : 'No'} />
          <InfoRow label="Can supply bulk quantities" value={d.bulkSupply == null ? null : d.bulkSupply ? 'Yes' : 'No'} />
        </BorderCard>

        {(d.gstin || d.businessRegistrationNumber || d.tradeLicenseNumber || d.ngoRegistrationNumber || d.governmentNurseryId) && (
          <BorderCard style={styles.card}>
            <SectionLabel>Business verification</SectionLabel>
            <InfoRow label="GSTIN" value={d.gstin} />
            <InfoRow label="Business registration" value={d.businessRegistrationNumber} />
            <InfoRow label="Trade license" value={d.tradeLicenseNumber} />
            <InfoRow label="NGO registration" value={d.ngoRegistrationNumber} />
            <InfoRow label="Government nursery ID" value={d.governmentNurseryId} />
          </BorderCard>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {nursery.status !== 'approved' && (
            <AnimatedButton
              label={setStatusMutation.isPending ? 'Working…' : 'Approve'}
              onPress={() => applyStatus('approved')}
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {nursery.status !== 'rejected' && (
            <AnimatedButton
              label="Reject"
              onPress={() => openReasonSheet('rejected')}
              variant="danger"
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {nursery.status !== 'suspended' && nursery.status !== 'pending' && (
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

      <Sheet visible={reasonSheet !== null} onClose={() => setReasonSheet(null)} title={reasonSheet === 'rejected' ? 'Reject nursery' : 'Suspend nursery'}>
        <Text style={[styles.sheetLabel, isNightMode && styles.sheetLabelNight]}>Reason (optional)</Text>
        <TextInput
          style={[styles.sheetInput, isNightMode && styles.sheetInputNight]}
          value={reason}
          onChangeText={setReason}
          placeholder="eg - Let them know why…"
          placeholderTextColor={isNightMode ? ON_DARK_SURFACE.muted : COLORS.textLight}
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: ON_DARK_SURFACE.primary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 14 },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 14, color: ON_DARK_SURFACE.secondary, lineHeight: 20 },
  infoRow: { marginTop: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: ON_DARK_SURFACE.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: ON_DARK_SURFACE.primary, marginTop: 2 },
  loadingText: { fontSize: 12, color: ON_DARK_SURFACE.muted, marginTop: 12, fontStyle: 'italic' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.sageLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  verificationPhoto: { width: '100%', height: 200, borderRadius: RADIUS.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 12, fontWeight: '600', color: ON_DARK_SURFACE.primary },
  error: { fontSize: 13, color: COLORS.dangerLight, marginBottom: 12 },
  actions: { gap: 10, marginTop: 4 },
  actionButton: {},
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  sheetButton: { marginTop: 16 },
  sheetLabelNight: { color: ON_DARK_SURFACE.secondary },
  sheetInputNight: { backgroundColor: 'rgba(255,255,255,0.08)', color: ON_DARK_SURFACE.primary },
});
