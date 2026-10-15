import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyReservations, useCancelReservation } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { resolveMediaUrl } from '../api/client';
import type { ApiMyReservation } from '../api/reservations';
import { useConfirm } from '../context/ConfirmDialogContext';

import { TEXT } from '../constants/typography';

type Filter = 'all' | 'pending' | 'fulfilled' | 'declined' | 'cancelled';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'declined', label: 'Declined' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

const RESPONDED_LABEL: Record<string, string> = {
  fulfilled: 'Fulfilled',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

function ReservationCard({ item, navigation }: { item: ApiMyReservation; navigation: any }) {
  const cancelMutation = useCancelReservation();
  const confirm = useConfirm();

  const statusColor =
    item.status === 'fulfilled' ? COLORS.sage : item.status === 'declined' ? COLORS.coral : item.status === 'cancelled' ? COLORS.textMuted : COLORS.golden;

  const handleCancel = () => {
    confirm('Cancel this request?', 'The nursery will no longer see it.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel request', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) },
    ]);
  };

  const openNursery = () => {
    if (item.nursery) navigation.navigate('NurseryPublicProfile', { nurseryId: item.nursery.id });
  };

  const requestAgain = () => {
    if (item.nursery) navigation.navigate('SaplingReservation', { nurseryId: item.nursery.id, stockId: item.stockId });
  };

  const respondedLabel = RESPONDED_LABEL[item.status];

  return (
    <BorderCard noPadding style={styles.card}>
      <TouchableOpacity style={styles.cardRow} onPress={openNursery} activeOpacity={0.8} disabled={!item.nursery}>
        {item.nursery?.logoUrl ? (
          <Image source={{ uri: resolveMediaUrl(item.nursery.logoUrl) }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}><Text style={{ fontSize: 18 }}>🌿</Text></View>
        )}
        <View style={styles.cardText}>
          <Text style={styles.nurseryName}>{item.nursery?.nurseryName ?? 'Nursery'}</Text>
          <Text style={styles.meta}>{item.quantity} × {item.species ?? 'saplings'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.details}>
        <Text style={styles.detailLine}>Requested · {formatDateTime(item.createdAt)}</Text>
        {respondedLabel && item.respondedAt ? (
          <Text style={styles.detailLine}>{respondedLabel} · {formatDateTime(item.respondedAt)}</Text>
        ) : null}
        {item.message ? <Text style={styles.message}>“{item.message}”</Text> : null}
      </View>

      <View style={styles.actions}>
        {item.status === 'pending' ? (
          <TouchableOpacity onPress={handleCancel} disabled={cancelMutation.isPending}>
            <Text style={styles.cancelText}>{cancelMutation.isPending ? 'Cancelling…' : 'Cancel request'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={requestAgain}>
            <Text style={styles.againText}>Request again</Text>
          </TouchableOpacity>
        )}
        {item.nursery ? (
          <TouchableOpacity onPress={openNursery}>
            <Text style={styles.againText}>View nursery</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </BorderCard>
  );
}

export function MySaplingReservationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const listQuery = useMyReservations();
  const { data: reservations = [], isLoading, refetch } = listQuery;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: reservations.length, pending: 0, fulfilled: 0, declined: 0, cancelled: 0 };
    for (const r of reservations) if (r.status in c) c[r.status as Filter] += 1;
    return c;
  }, [reservations]);

  const visible = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter);

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
        <Text style={styles.headerTitle}>My Reservations</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : reservations.length === 0 ? (
        <EmptyState icon="🌱" title="No requests yet" body="Requests you send to nurseries for saplings will show up here." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                  {f.label} ({counts[f.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            {...infiniteScrollProps(listQuery)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
          >
            {visible.length === 0 ? (
              <Text style={styles.noneText}>No {filter} requests.</Text>
            ) : (
              visible.map((r) => <ReservationCard key={r.id} item={r} navigation={navigation} />)
            )}
            <PageFooter loading={listQuery.isFetchingNextPage} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: SPACING.md, gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)' },
  chipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  noneText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
  card: { borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  logoPlaceholder: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  nurseryName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  details: { gap: 2 },
  detailLine: { fontSize: 12, color: COLORS.textSecondary },
  message: { fontSize: 12, fontStyle: 'italic', color: COLORS.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 18 },
  cancelText: { fontSize: 12, color: COLORS.coral, fontWeight: '700' },
  againText: { fontSize: 12, color: COLORS.forest, fontWeight: '700' },
});
