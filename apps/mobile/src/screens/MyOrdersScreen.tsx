import React, { useMemo, useState } from 'react';
import { View, Linking, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyOrders, useCancelOrder, useMyOrdersSummary } from '../hooks/useApiQueries';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { flattenPages, infiniteScrollProps } from '../hooks/useInfiniteList';
import { PageFooter } from '../components/common/PageFooter';
import { cancelOrderMessage, needsNurseryContact } from '../api/orders';
import type { ApiOrder, OrderStatus } from '../api/orders';
import { useConfirm } from '../context/ConfirmDialogContext';

import { TEXT } from '../constants/typography';
function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Payment pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  plantation_verified: '🌳 Plantation verified',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: COLORS.textMuted,
  confirmed: COLORS.forest,
  packed: COLORS.forest,
  ready_for_pickup: COLORS.amber,
  out_for_delivery: COLORS.amber,
  picked_up: COLORS.forest,
  delivered: COLORS.forest,
  plantation_verified: COLORS.forest,
  cancelled: COLORS.dangerDark,
};

type Filter = 'all' | 'active' | 'completed' | 'cancelled';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const COMPLETED: OrderStatus[] = ['picked_up', 'delivered', 'plantation_verified'];
function bucket(status: OrderStatus): Exclude<Filter, 'all'> {
  if (status === 'cancelled') return 'cancelled';
  return COMPLETED.includes(status) ? 'completed' : 'active';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderRow({ order, navigation }: { order: ApiOrder; navigation: any }) {
  const confirm = useConfirm();
  const cancelMutation = useCancelOrder();
  const canCancel = ['pending_payment', 'confirmed'].includes(order.status);
  const openOrder = () => navigation.navigate('OrderDetail', { orderId: order.id });
  const openNursery = () => navigation.navigate('NurseryPublicProfile', { nurseryId: order.nursery.id });
  const handleCancel = () =>
    confirm('Cancel this order?', cancelOrderMessage(order), [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => cancelMutation.mutate(order.id) },
    ]);

  return (
    <BorderCard noPadding style={styles.row}>
      <TouchableOpacity onPress={openOrder} activeOpacity={0.85} style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nursery}>{order.nursery.nurseryName}</Text>
          <Text style={styles.items} numberOfLines={2}>
            {order.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')}
          </Text>
          <Text style={[styles.status, { color: STATUS_COLOR[order.status] }]}>{STATUS_LABEL[order.status]}</Text>
        </View>
        <Text style={styles.total}>{formatRupees(order.totalCents)}</Text>
      </TouchableOpacity>
      <Text style={styles.meta}>
        #{order.id.slice(-6).toUpperCase()} · {formatDate(order.createdAt)} · {order.fulfillmentType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
      </Text>
      <View style={styles.actions}>
        {order.status === 'out_for_delivery' ? (
          <TouchableOpacity onPress={openOrder}><Text style={styles.linkText}>Track order</Text></TouchableOpacity>
        ) : null}
        {canCancel ? (
          <TouchableOpacity onPress={handleCancel} disabled={cancelMutation.isPending}>
            <Text style={styles.cancelText}>{cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}</Text>
          </TouchableOpacity>
        ) : null}
        {needsNurseryContact(order.status) ? (
          <TouchableOpacity onPress={() => (order.nursery.contactPhone ? Linking.openURL(`tel:${order.nursery.contactPhone}`) : openNursery())}>
            <Text style={styles.cancelText}>Contact nursery</Text>
          </TouchableOpacity>
        ) : null}
        {!canCancel && !needsNurseryContact(order.status) ? (
          <TouchableOpacity onPress={openNursery}><Text style={styles.linkText}>Buy again</Text></TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={openNursery}><Text style={styles.linkText}>View nursery</Text></TouchableOpacity>
        <TouchableOpacity onPress={openOrder}><Text style={styles.linkText}>Details</Text></TouchableOpacity>
      </View>
    </BorderCard>
  );
}

export function MyOrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'completed' | 'cancelled' | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const q = useDebouncedValue(search.trim());
  const query = useMyOrders({ q: q || undefined, group: filter ?? undefined, sort });
  const { isLoading, refetch } = query;
  const orders = flattenPages(query.data);
  const summaryQuery = useMyOrdersSummary();
  const summary = summaryQuery.data;
  const { refreshing, onRefresh } = usePullToRefresh([refetch, summaryQuery.refetch]);
  const isFiltering = !!q || !!filter;

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : orders.length === 0 && !isFiltering ? (
        <EmptyState icon="📦" title="No orders yet" body="Saplings you buy from nurseries will show up here." />
      ) : (
        <>
          <ListFilterBar
            query={search}
            onQueryChange={setSearch}
            placeholder="Search by nursery, sapling or order #"
            options={[
              { key: null, label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
            ]}
            value={filter}
            onChange={setFilter}
            rows={[
              {
                label: 'Sort',
                options: [
                  { key: 'newest', label: 'Newest' },
                  { key: 'oldest', label: 'Oldest' },
                  { key: 'highest', label: 'Highest value' },
                ],
                value: sort,
                onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'highest'),
              },
            ]}
          />
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            {...infiniteScrollProps(query)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
          >
            {orders.length === 0 ? (
              <Text style={styles.noneText}>No matching orders.</Text>
            ) : (
              orders.map((order) => <OrderRow key={order.id} order={order} navigation={navigation} />)
            )}
            <PageFooter loading={query.isFetchingNextPage} />
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
  scrollContent: { paddingHorizontal: 20 },
  row: { borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  nursery: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  items: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  meta: { fontSize: 11, color: COLORS.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  linkText: { fontSize: 12, color: COLORS.forest, fontWeight: '700' },
  cancelText: { fontSize: 12, color: COLORS.coral, fontWeight: '700' },
  search: { marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)', fontSize: 14, color: COLORS.textPrimary },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)' },
  chipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  noneText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
});
