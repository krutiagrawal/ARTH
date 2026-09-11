import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
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

// Kept to a single row of simple chips per the product spec ("not a complex filter UI") — status
// on top, fulfillment type underneath, rather than one combinatorial picker.
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

const FULFILLMENT_TABS: { key: 'all' | 'pickup' | 'delivery'; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
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
  const [fulfillmentTab, setFulfillmentTab] = useState<'all' | 'pickup' | 'delivery'>('all');
  const { data: orders = [], isLoading } = useNurseryOrders({
    status: statusTab === 'all' ? undefined : statusTab,
    fulfillmentType: fulfillmentTab === 'all' ? undefined : fulfillmentTab,
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Orders" subtitle="Marketplace purchases to fulfil" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setStatusTab(t.key)} style={[styles.tab, statusTab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, statusTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRowSecondary}>
        {FULFILLMENT_TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setFulfillmentTab(t.key)} style={[styles.tabSmall, fulfillmentTab === t.key && styles.tabSmallActive]}>
            <Text style={[styles.tabSmallText, fulfillmentTab === t.key && styles.tabSmallTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : orders.length === 0 ? (
        <EmptyState icon="🚚" title="Nothing here" body="Orders in this stage will show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} navigation={navigation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // A horizontal ScrollView doesn't reliably self-size its height to content (especially on
  // Android) — left unconstrained it can grow to fill whatever space this flex-column screen
  // gives it, which centers the (correctly-sized) chips inside a much taller box than intended.
  // flexGrow: 0 pins it to its content height instead.
  tabsScroll: { flexGrow: 0 },
  // alignItems: 'center' is load-bearing — a horizontal ScrollView's content container is a flex
  // row with no explicit height, so without it each chip defaults to `alignItems: 'stretch'` and
  // grows to fill whatever cross-axis height the ScrollView ends up given, instead of sizing to
  // its own text (looks like a tall vertical pill rather than a small horizontal one).
  tabsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, gap: 8, paddingTop: 10, paddingBottom: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  tabActive: { backgroundColor: COLORS.forest },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  tabsRowSecondary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, gap: 6, paddingBottom: 10 },
  tabSmall: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: COLORS.sand },
  tabSmallActive: { backgroundColor: COLORS.golden, borderColor: COLORS.golden },
  tabSmallText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  tabSmallTextActive: { color: COLORS.white },
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
