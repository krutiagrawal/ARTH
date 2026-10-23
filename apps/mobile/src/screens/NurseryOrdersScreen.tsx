import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNurseryOrders, useNurseryOrdersSummary, usePackOrder } from '../hooks/useApiQueries';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { BulkActionBar, SelectBox, AttentionBadge, useBulkSelection } from '../components/ngo/ManageListTools';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { ApiNurseryOrder, NurseryOrderStatus } from '../api/nursery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRequireApproval } from '../hooks/useRequireApproval';
import { flattenPages, infiniteScrollProps } from '../hooks/useInfiniteList';
import { PageFooter } from '../components/common/PageFooter';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

const STATUS_LABEL: Record<NurseryOrderStatus, string> = {
  pending_payment: 'Payment pending',
  confirmed: 'New order',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  plantation_verified: 'Plantation verified',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<NurseryOrderStatus, string> = {
  pending_payment: COLORS.textMuted,
  confirmed: COLORS.golden,
  packed: COLORS.xpBlue,
  ready_for_pickup: COLORS.amber,
  picked_up: COLORS.sage,
  out_for_delivery: COLORS.amber,
  delivered: COLORS.sage,
  plantation_verified: COLORS.forest,
  cancelled: COLORS.coral,
};

const STATUS_TABS: { key: NurseryOrderStatus | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'confirmed', label: 'New' },
  { key: 'packed', label: 'Preparing' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'plantation_verified', label: 'Plantation verified' },
  { key: 'cancelled', label: 'Cancelled' },
];

function OrderRow({
  order,
  navigation,
  selectMode,
  onToggle,
  onLongPress,
}: {
  order: ApiNurseryOrder;
  navigation: any;
  selectMode?: boolean;
  onToggle?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => (selectMode ? onToggle?.() : navigation.navigate('NurseryOrderDetail', { orderId: order.id }))}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <BorderCard noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customer}>{order.user.name}</Text>
          <Text style={styles.items} numberOfLines={1}>
            {order.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[order.status]}22` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>{STATUS_LABEL[order.status]}</Text>
            </View>
            <Text style={styles.fulfillmentTag}>{order.fulfillmentType === 'pickup' ? '🚶 Pickup' : '🚴 Delivery'}</Text>
          </View>
        </View>
        <Text style={styles.total}>{formatRupees(order.totalCents)}</Text>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function NurseryOrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<NurseryOrderStatus | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'scheduled'>('newest');
  const q = useDebouncedValue(search.trim());
  const query = useNurseryOrders({ q: q || undefined, status: statusTab ?? undefined, sort });
  const { isLoading, refetch } = query;
  const orders = useMemo(() => flattenPages(query.data), [query.data]);
  const summaryQuery = useNurseryOrdersSummary();
  const summary = summaryQuery.data;
  const { refreshing, onRefresh } = usePullToRefresh([refetch, summaryQuery.refetch]);
  const bulk = useBulkSelection();
  const requireApproval = useRequireApproval();
  const packMutation = usePackOrder();
  const isFiltering = !!q || !!statusTab;

  // Packing is the one safe repeatable action; cancelling refunds money, so it stays per order on the detail screen.
  const bulkActions = [
    {
      label: 'Mark as packed',
      confirmText: 'Only new orders can be packed – any others in your selection are skipped.',
      run: (id: string) => packMutation.mutateAsync(id),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Orders" subtitle="Marketplace purchases to fulfil" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <ListFilterBar
        query={search}
        onQueryChange={setSearch}
        placeholder="Search customer, sapling, city or order #"
        options={STATUS_TABS}
        value={statusTab}
        onChange={setStatusTab}
        rows={[
          {
            label: 'Sort',
            options: [
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'highest', label: 'Highest value' },
              { key: 'scheduled', label: 'Scheduled soonest' },
            ],
            value: sort,
            onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'highest' | 'scheduled'),
          },
        ]}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="🚚"
          title={isFiltering ? 'No orders match' : 'No orders yet'}
          body={isFiltering ? 'Try a different search or filter.' : 'Orders from the marketplace will show up here.'}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 + (bulk.selected.size > 0 ? 90 : 0) }]}
          showsVerticalScrollIndicator={false}
          {...infiniteScrollProps(query)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {orders.map((o) => {
            const waitingDays = o.readyForPickupAt ? (Date.now() - new Date(o.readyForPickupAt).getTime()) / 86_400_000 : 0;
            const attention =
              o.status === 'confirmed' ? 'New – ready to pack' : o.status === 'ready_for_pickup' && waitingDays > 2 ? 'Waiting for pickup' : null;
            return (
              <View key={o.id}>
                {bulk.selectMode && <SelectBox selected={bulk.selected.has(o.id)} />}
                <OrderRow
                  order={o}
                  navigation={navigation}
                  selectMode={bulk.selectMode}
                  onToggle={() => bulk.toggle(o.id)}
                  onLongPress={() => bulk.beginSelect(o.id)}
                />
                {attention && <AttentionBadge text={attention} />}
              </View>
            );
          })}
          <PageFooter loading={query.isFetchingNextPage} />
        </ScrollView>
      )}

      <BulkActionBar count={bulk.selected.size} actions={bulkActions} busy={bulk.busy} onAction={requireApproval(bulk.onAction)} bottomOffset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 150,
  },
  filterButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  filterButtonChevron: { fontSize: 12, color: COLORS.textSecondary },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 107, 71, 0.15)',
  },
  sheetOptionText: { fontSize: 15 },
  sheetCheck: { fontSize: 16, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  customer: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  items: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  fulfillmentTag: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
});
