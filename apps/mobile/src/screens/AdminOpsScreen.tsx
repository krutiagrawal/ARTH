import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import {
  useAdminDrives,
  useCancelAdminDrive,
  useAdminDonations,
  useRefundAdminDonation,
  useAdminOrders,
  useRefundAdminOrder,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

type Tab = 'drives' | 'donations' | 'orders';

const TABS: { key: Tab; label: string }[] = [
  { key: 'drives', label: 'Drives' },
  { key: 'donations', label: 'Donations' },
  { key: 'orders', label: 'Orders' },
];

function money(cents: number, currency = 'inr') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency.toUpperCase() }).format((cents ?? 0) / 100);
}

export function AdminOpsScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const [tab, setTab] = useState<Tab>('drives');
  const [pending, setPending] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const drivesQuery = useAdminDrives();
  const donationsQuery = useAdminDonations();
  const ordersQuery = useAdminOrders();

  const cancelDrive = useCancelAdminDrive();
  const refundDonation = useRefundAdminDonation();
  const refundOrder = useRefundAdminOrder();

  const { data, isLoading, items, listKey } =
    tab === 'drives'
      ? { ...drivesQuery, items: drivesQuery.data?.drives ?? [], listKey: 'drives' as const }
      : tab === 'donations'
        ? { ...donationsQuery, items: donationsQuery.data?.donations ?? [], listKey: 'donations' as const }
        : { ...ordersQuery, items: ordersQuery.data?.orders ?? [], listKey: 'orders' as const };

  const working = cancelDrive.isPending || refundDonation.isPending || refundOrder.isPending;

  const confirmAction = async () => {
    if (!pending) return;
    setError(null);
    try {
      if (tab === 'drives') await cancelDrive.mutateAsync({ id: pending.id, reason: reason.trim() || undefined });
      if (tab === 'donations') await refundDonation.mutateAsync({ id: pending.id, reason: reason.trim() || undefined });
      if (tab === 'orders') await refundOrder.mutateAsync({ id: pending.id, reason: reason.trim() || undefined });
      setPending(null);
      setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  };

  const isDisabled = (item: any) =>
    tab === 'drives' ? item.status === 'cancelled' : tab === 'orders' ? item.status === 'cancelled' : item.status !== 'succeeded';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Operations</Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.chip, tab === t.key && styles.chipActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.chipText, tab === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && items.length === 0 && <EmptyState icon="📦" title={`No ${tab}`} body="Nothing here yet." tint="dark" />}

        {items.map((item: any) => (
          <BorderCard key={item.id} style={styles.card}>
            {tab === 'drives' && (
              <>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.ngo?.orgName} · {item._count?.rsvps ?? 0} RSVPs</Text>
              </>
            )}
            {tab === 'donations' && (
              <>
                <Text style={styles.cardTitle} numberOfLines={1}>{money(item.amountCents, item.currency)} to {item.campaign?.title}</Text>
                <Text style={styles.cardMeta}>{item.campaign?.ngo?.orgName} · from {item.user?.name}</Text>
              </>
            )}
            {tab === 'orders' && (
              <>
                <Text style={styles.cardTitle} numberOfLines={1}>{money(item.totalCents, item.currency)} · {item.nursery?.nurseryName}</Text>
                <Text style={styles.cardMeta}>Ordered by {item.user?.name}</Text>
              </>
            )}
            <View style={styles.cardFooterRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{item.status}</Text>
              </View>
              {!isDisabled(item) && (
                <AnimatedButton
                  label={tab === 'drives' ? 'Cancel' : 'Refund'}
                  onPress={() => { setPending(item); setError(null); }}
                  variant="danger"
                  size="sm"
                />
              )}
            </View>
          </BorderCard>
        ))}
      </ScrollView>

      <Sheet visible={Boolean(pending)} onClose={() => setPending(null)} title={tab === 'drives' ? 'Cancel this drive?' : 'Refund this transaction?'}>
        <Text style={styles.sheetLabel}>
          {tab === 'drives' ? 'RSVPs stay on record but the drive is marked cancelled.' : 'This issues a real Stripe refund and cannot be undone.'}
        </Text>
        <Text style={[styles.sheetLabel, { marginTop: 12 }]}>Reason (optional)</Text>
        <TextInput
          style={styles.sheetInput}
          value={reason}
          onChangeText={setReason}
          placeholder="What happened?"
          placeholderTextColor={ON_DARK_SURFACE.muted}
          multiline
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <AnimatedButton
          label={working ? 'Working…' : tab === 'drives' ? 'Confirm cancel' : 'Confirm refund'}
          onPress={confirmAction}
          variant="danger"
          disabled={working}
          fullWidth
          style={styles.sheetButton}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  filterBar: { paddingHorizontal: 20, marginBottom: 8 },
  chipRow: { gap: 8, paddingRight: 20 },
  chip: { borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: 'rgba(200,230,192,0.18)', borderColor: COLORS.mint },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  chipTextActive: { color: COLORS.mint, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  cardMeta: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 4 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: ON_DARK_SURFACE.secondary },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top', marginTop: 6 },
  sheetButton: { marginTop: 16 },
  error: { fontSize: 13, color: COLORS.danger, marginTop: 10 },
});
