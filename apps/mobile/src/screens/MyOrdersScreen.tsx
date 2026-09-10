import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyOrders } from '../hooks/useApiQueries';
import type { ApiOrder, OrderStatus } from '../api/orders';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Payment pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: COLORS.textMuted,
  confirmed: COLORS.forest,
  packed: COLORS.forest,
  out_for_delivery: COLORS.amber,
  delivered: COLORS.forest,
  cancelled: COLORS.dangerDark,
};

function OrderRow({ order, onPress }: { order: ApiOrder; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nursery}>{order.nursery.nurseryName}</Text>
          <Text style={styles.items} numberOfLines={1}>
            {order.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')}
          </Text>
          <Text style={[styles.status, { color: STATUS_COLOR[order.status] }]}>{STATUS_LABEL[order.status]}</Text>
        </View>
        <Text style={styles.total}>{formatRupees(order.totalCents)}</Text>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function MyOrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: orders, isLoading } = useMyOrders();

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
      ) : !orders || orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet" body="Saplings you buy from nurseries will show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  nursery: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  items: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
});
