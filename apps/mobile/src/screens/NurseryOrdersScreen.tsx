import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BlurCard } from '../components/common/GlassCard';
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
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<NurseryOrderStatus, string> = {
  pending_payment: COLORS.textMuted,
  confirmed: COLORS.golden,
  packed: COLORS.xpBlue,
  out_for_delivery: COLORS.amber,
  delivered: COLORS.sage,
  cancelled: COLORS.coral,
};

const TABS: { key: NurseryOrderStatus; label: string }[] = [
  { key: 'confirmed', label: 'New' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Delivering' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function OrderRow({ order, navigation }: { order: ApiNurseryOrder; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('NurseryOrderDetail', { orderId: order.id })} activeOpacity={0.85}>
      <BlurCard tint="light" noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customer}>{order.user.name}</Text>
          <Text style={styles.items} numberOfLines={1}>
            {order.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[order.status]}22` }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>{STATUS_LABEL[order.status]}</Text>
          </View>
        </View>
        <Text style={styles.total}>{formatRupees(order.totalCents)}</Text>
      </BlurCard>
    </TouchableOpacity>
  );
}

export function NurseryOrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<NurseryOrderStatus>('confirmed');
  const { data: orders = [], isLoading } = useNurseryOrders(tab);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Orders" subtitle="Marketplace purchases to fulfil" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
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
  tabsRow: { paddingHorizontal: SPACING.md, gap: 8, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  tabActive: { backgroundColor: COLORS.forest },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { paddingHorizontal: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  customer: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  items: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
});
