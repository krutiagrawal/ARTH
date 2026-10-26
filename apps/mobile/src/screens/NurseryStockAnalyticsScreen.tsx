import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EcoWidget } from '../components/common/EcoWidget';
import { EmptyState } from '../components/common/EmptyState';
import { Sheet } from '../components/common/Sheet';
import { useStockAnalytics, useStockLedgerPaged, useNurseryReservations, useMyBulkResponses, useSaplingStock } from '../hooks/useApiQueries';
import type { ApiStockLedgerEntry } from '../api/nursery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { PageFooter } from '../components/common/PageFooter';

import { TEXT } from '../constants/typography';
const REASON_LABEL: Record<ApiStockLedgerEntry['reason'], string> = {
  manual_add: 'Added stock',
  manual_adjust: 'Adjusted stock',
  manual_remove: 'Removed stock',
  reservation_fulfilled: 'Given to a planter',
  order_placed: 'Sold via order',
  order_cancelled: 'Order cancelled – restocked',
  bulk_requirement_fulfilled: 'Fulfilled a bulk requirement',
};

function LedgerRow({ item }: { item: ApiStockLedgerEntry }) {
  const positive = item.delta > 0;
  return (
    <BorderCard noPadding style={styles.ledgerRow}>
      <View style={styles.ledgerText}>
        <Text style={styles.ledgerSpecies}>{item.species}</Text>
        <Text style={styles.ledgerMeta}>
          {REASON_LABEL[item.reason] ?? item.reason} · {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.ledgerDelta, { color: positive ? COLORS.sage : COLORS.coral }]}>
        {positive ? '+' : ''}
        {item.delta}
      </Text>
    </BorderCard>
  );
}

type Kpi = 'given' | 'added' | 'requests' | 'stock';

const KPI_TITLE: Record<Kpi, string> = {
  given: 'Given out (lifetime)',
  added: 'Added (lifetime)',
  requests: 'Requests fulfilled',
  stock: 'Currently in stock',
};

function DetailRow({ title, meta, value, color }: { title: string; meta: string; value: string; color: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.ledgerText}>
        <Text style={styles.ledgerSpecies}>{title}</Text>
        <Text style={styles.ledgerMeta}>{meta}</Text>
      </View>
      <Text style={[styles.ledgerDelta, { color }]}>{value}</Text>
    </View>
  );
}

function DetailList({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode[] }) {
  if (loading) return <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 20 }} />;
  if (children.length === 0) return <Text style={styles.detailEmpty}>{empty}</Text>;
  return <>{children}</>;
}

/** Shown under a sheet list while more pages remain on the server. */
function LoadMore({ visible, loading, onPress }: { visible: boolean; loading: boolean; onPress: () => void }) {
  if (!visible) return null;
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} style={styles.loadMore}>
      <Text style={styles.loadMoreText}>{loading ? 'Loading…' : 'Load more'}</Text>
    </TouchableOpacity>
  );
}

/** Ledger rows behind "Given out" / "Added": the same movements the totals add up, newest first.
 * Paged, with the "increase only" rule applied by the server (`direction=in`). */
function LedgerKpiDetail({ kind }: { kind: 'given' | 'added' }) {
  const reasons: ApiStockLedgerEntry['reason'][] =
    kind === 'given'
      ? ['reservation_fulfilled', 'order_placed', 'bulk_requirement_fulfilled', 'order_cancelled']
      : ['manual_add', 'manual_adjust'];
  // "Added" only counts increases; a manual adjustment downward isn't an addition.
  const q = useStockLedgerPaged({ reasons, direction: kind === 'added' ? 'in' : undefined });
  const rows = q.data ?? [];
  return (
    <>
      <DetailList loading={q.isLoading} empty={kind === 'given' ? 'Nothing given out yet.' : 'No stock added yet.'}>
        {rows.map((r) => (
          <DetailRow
            key={r.id}
            title={r.species}
            meta={`${REASON_LABEL[r.reason] ?? r.reason} · ${new Date(r.createdAt).toLocaleDateString()}`}
            value={kind === 'given' ? `${r.delta < 0 ? '' : '+'}${r.delta}` : `+${r.delta}`}
            color={r.delta > 0 ? COLORS.sage : COLORS.coral}
          />
        ))}
      </DetailList>
      <LoadMore visible={!!q.hasNextPage} loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />
    </>
  );
}

function RequestsKpiDetail() {
  const reservationsQuery = useNurseryReservations('fulfilled');
  const responsesQuery = useMyBulkResponses();
  const { data: reservations = [], isLoading: l1 } = reservationsQuery;
  const { data: responses = [], isLoading: l2 } = responsesQuery;
  const hasMore = !!reservationsQuery.hasNextPage || !!responsesQuery.hasNextPage;
  const rows = [
    ...reservations.map((r) => ({
      id: `r-${r.id}`,
      title: r.species ?? 'Reservation',
      meta: `Planter request${r.requester ? ` · ${r.requester.name}` : ''} · ${new Date(r.respondedAt ?? r.createdAt).toLocaleDateString()}`,
      qty: r.quantity,
      at: new Date(r.respondedAt ?? r.createdAt).getTime(),
    })),
    ...responses
      .filter((r) => r.status === 'fulfilled')
      .map((r) => ({
        id: `b-${r.id}`,
        title: r.species,
        meta: `Bulk requirement · ${r.ngoName} · ${new Date(r.respondedAt ?? r.createdAt).toLocaleDateString()}`,
        qty: r.quantityOffered,
        at: new Date(r.respondedAt ?? r.createdAt).getTime(),
      })),
  ].sort((a, b) => b.at - a.at);
  const loadMore = () => {
    if (reservationsQuery.hasNextPage) reservationsQuery.fetchNextPage();
    if (responsesQuery.hasNextPage) responsesQuery.fetchNextPage();
  };
  return (
    <>
      <DetailList loading={l1 || l2} empty="No fulfilled requests yet.">
        {rows.map((r) => (
          <DetailRow key={r.id} title={r.title} meta={r.meta} value={`${r.qty}`} color={COLORS.xpBlue} />
        ))}
      </DetailList>
      <LoadMore
        visible={hasMore}
        loading={reservationsQuery.isFetchingNextPage || responsesQuery.isFetchingNextPage}
        onPress={loadMore}
      />
    </>
  );
}

function StockKpiDetail() {
  // "In stock" = available + low stock. The server filters each band, so no page is wasted on
  // sold-out rows and nothing is filtered on the phone.
  const availableQuery = useSaplingStock({ availability: 'available' });
  const lowQuery = useSaplingStock({ availability: 'low_stock' });
  const rows = [...(availableQuery.data ?? []), ...(lowQuery.data ?? [])];
  const loadMore = () => {
    if (availableQuery.hasNextPage) availableQuery.fetchNextPage();
    if (lowQuery.hasNextPage) lowQuery.fetchNextPage();
  };
  return (
    <>
      <DetailList loading={availableQuery.isLoading || lowQuery.isLoading} empty="Nothing in stock right now.">
        {rows.map((s) => (
          <DetailRow
            key={s.id}
            title={s.speciesRef?.commonName ?? s.species}
            meta={s.availabilityStatus === 'low_stock' ? 'Low stock' : 'In stock'}
            value={`${s.quantity}`}
            color={s.availabilityStatus === 'low_stock' ? COLORS.danger : COLORS.earth}
          />
        ))}
      </DetailList>
      <LoadMore
        visible={!!availableQuery.hasNextPage || !!lowQuery.hasNextPage}
        loading={availableQuery.isFetchingNextPage || lowQuery.isFetchingNextPage}
        onPress={loadMore}
      />
    </>
  );
}

export function NurseryStockAnalyticsScreen({ navigation }: any) {
  const [openKpi, setOpenKpi] = useState<Kpi | null>(null);
  const insets = useSafeAreaInsets();
  const { data: analytics, isLoading: statsLoading, refetch: refetchAnalytics } = useStockAnalytics();
  const ledgerQuery = useStockLedgerPaged();
  const { data: ledger = [], isLoading: ledgerLoading, refetch: refetchLedger } = ledgerQuery;
  const { refreshing, onRefresh } = usePullToRefresh([refetchAnalytics, refetchLedger]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Stock Analytics"
        subtitle="How your inventory has grown over time"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {statsLoading || !analytics ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          {...infiniteScrollProps(ledgerQuery)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <View style={styles.gridRow}>
            <EcoWidget icon="🎁" value={analytics.totalGivenOutLifetime} label="Given out (lifetime)" sublabel="Tap for details" onPress={() => setOpenKpi('given')} color={COLORS.golden} delay={0} style={styles.gridTile} fill />
            <EcoWidget icon="🌱" value={analytics.totalAddedLifetime} label="Added (lifetime)" sublabel="Tap for details" onPress={() => setOpenKpi('added')} color={COLORS.sage} delay={60} style={styles.gridTile} fill />
          </View>
          <View style={styles.gridRow}>
            <EcoWidget icon="🤝" value={analytics.reservationsFulfilled} label="Requests fulfilled" sublabel="Tap for details" onPress={() => setOpenKpi('requests')} color={COLORS.xpBlue} delay={120} style={styles.gridTile} fill />
            <EcoWidget icon="📦" value={analytics.currentTotalQuantity} label="Currently in stock" sublabel="Tap for details" onPress={() => setOpenKpi('stock')} color={COLORS.earth} delay={180} style={styles.gridTile} fill />
          </View>

          <AnimatedButton
            label="📈  Full report by date"
            onPress={() => navigation.navigate('NurseryReports')}
            variant="secondary"
            size="md"
            fullWidth
            style={{ marginTop: 14 }}
          />

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {ledgerLoading ? (
            <ActivityIndicator color={COLORS.sage} style={{ marginTop: 12 }} />
          ) : ledger.length === 0 ? (
            <EmptyState icon="📜" title="No activity yet" body="Stock changes will show up here." />
          ) : (
            ledger.map((item) => <LedgerRow key={item.id} item={item} />)
          )}
          <PageFooter loading={ledgerQuery.isFetchingNextPage} />
        </ScrollView>
      )}

      <Sheet visible={openKpi !== null} onClose={() => setOpenKpi(null)} title={openKpi ? KPI_TITLE[openKpi] : undefined} scrollable>
        {openKpi === 'given' || openKpi === 'added' ? <LedgerKpiDetail kind={openKpi} /> : null}
        {openKpi === 'requests' ? <RequestsKpiDetail /> : null}
        {openKpi === 'stock' ? <StockKpiDetail /> : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },
  sectionTitle: { ...TEXT.subheading, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
  },
  ledgerText: { flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.sand },
  loadMore: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  detailEmpty: { textAlign: 'center', color: COLORS.textSecondary, marginVertical: 24, fontSize: 13 },
  ledgerSpecies: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  ledgerMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  ledgerDelta: { fontSize: 15, fontWeight: '800' },
});
