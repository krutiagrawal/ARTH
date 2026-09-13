import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { Sheet } from '../components/common/Sheet';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';
import { useNurseryOrders } from '../hooks/useApiQueries';
import type { ApiNurseryOrder, NurseryOrderStatus } from '../api/nursery';

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

// A dropdown sheet rather than a horizontally-scrolling chip row — 9 statuses made for a long
// scroll, and a separate fulfillment-type row duplicated concepts already visible per-order
// (each row already tags itself Pickup/Delivery) — one combined filter control instead.
const STATUS_TABS: { key: NurseryOrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'New' },
  { key: 'packed', label: 'Preparing' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'plantation_verified', label: 'Plantation verified' },
  { key: 'cancelled', label: 'Cancelled' },
];

function OrderRow({ order, navigation }: { order: ApiNurseryOrder; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('NurseryOrderDetail', { orderId: order.id })} activeOpacity={0.85}>
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
  const [statusTab, setStatusTab] = useState<NurseryOrderStatus | 'all'>('confirmed');
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: orders = [], isLoading } = useNurseryOrders({
    status: statusTab === 'all' ? undefined : statusTab,
  });

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) => o.user.name.toLowerCase().includes(q) || o.items.some((i) => i.species.toLowerCase().includes(q)),
    );
  }, [orders, searchQuery]);

  const currentStatusLabel = STATUS_TABS.find((t) => t.key === statusTab)?.label ?? 'All';

  // The Sheet component switches to a dark navy surface at night (see Sheet.tsx's `isNightMode`)
  // but has no way to tell its children — without this, the sheet's option text stayed the
  // light-mode dark/green colors, illegible on that dark background.
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Orders" subtitle="Marketplace purchases to fulfil" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <View style={styles.filterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer or species"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowStatusSheet(true)} activeOpacity={0.85}>
          <Text style={styles.filterButtonText} numberOfLines={1}>{currentStatusLabel}</Text>
          <Text style={styles.filterButtonChevron}>▾</Text>
        </TouchableOpacity>
      </View>

      <Sheet visible={showStatusSheet} onClose={() => setShowStatusSheet(false)} title="Filter by status" scrollable>
        {STATUS_TABS.map((t) => {
          const active = statusTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.sheetOption, isNightMode && styles.sheetOptionNight]}
              onPress={() => {
                setStatusTab(t.key);
                setShowStatusSheet(false);
              }}
            >
              <Text
                style={[
                  styles.sheetOptionText,
                  { color: isNightMode ? ON_DARK_SURFACE.primary : COLORS.textPrimary },
                  active && { color: isNightMode ? COLORS.mintLight : COLORS.forest, fontWeight: '700' },
                ]}
              >
                {t.label}
              </Text>
              {active && <Text style={[styles.sheetCheck, { color: isNightMode ? COLORS.mintLight : COLORS.forest }]}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </Sheet>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="🚚"
          title="Nothing here"
          body={searchQuery.trim() && orders.length > 0 ? 'No orders match your search.' : 'Orders in this stage will show up here.'}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {filteredOrders.map((o) => (
            <OrderRow key={o.id} order={o} navigation={navigation} />
          ))}
        </ScrollView>
      )}
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
  sheetOptionNight: { borderBottomColor: 'rgba(255,255,255,0.12)' },
  // Colors applied inline based on isNightMode at the call site — see the sheetOption comment.
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
