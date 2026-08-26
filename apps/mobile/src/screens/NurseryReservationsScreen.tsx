import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BlurCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNurseryReservations, useFulfillReservation, useDeclineReservation } from '../hooks/useApiQueries';
import type { ApiNurseryReservation } from '../api/nursery';

function ReservationRow({ item, showActions }: { item: ApiNurseryReservation; showActions: boolean }) {
  const fulfillMutation = useFulfillReservation();
  const declineMutation = useDeclineReservation();

  const handleFulfill = () => {
    Alert.alert('Fulfil this request?', `Give ${item.quantity} ${item.species ?? 'saplings'} to ${item.requester?.name ?? 'this planter'}. Stock will be reduced.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fulfil', onPress: () => fulfillMutation.mutate(item.id) },
    ]);
  };

  const handleDecline = () => {
    Alert.alert('Decline this request?', 'The planter will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => declineMutation.mutate(item.id) },
    ]);
  };

  const statusColor =
    item.status === 'fulfilled' ? COLORS.sage : item.status === 'declined' ? COLORS.coral : item.status === 'cancelled' ? COLORS.textMuted : COLORS.golden;

  return (
    <BlurCard tint="light" noPadding style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.avatar}>{item.requester?.avatarEmoji ?? '🧑'}</Text>
        <View style={styles.rowText}>
          <Text style={styles.requester}>{item.requester?.name ?? 'A planter'}</Text>
          <Text style={styles.meta}>
            {item.quantity} × {item.species ?? 'saplings'} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}
      {showActions && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline} disabled={declineMutation.isPending}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fulfillButton} onPress={handleFulfill} disabled={fulfillMutation.isPending}>
            <Text style={styles.fulfillText}>{fulfillMutation.isPending ? 'Fulfilling…' : 'Fulfil'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </BlurCard>
  );
}

export function NurseryReservationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reservations = [], isLoading } = useNurseryReservations();

  const pending = reservations.filter((r) => r.status === 'pending');
  const responded = reservations.filter((r) => r.status !== 'pending');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Reservations"
        subtitle="Requests from planters for your stock"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : reservations.length === 0 ? (
        <EmptyState icon="🌱" title="No requests yet" body="When planters request saplings from your stock, they'll show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
              {pending.map((r) => (
                <ReservationRow key={r.id} item={r} showActions />
              ))}
            </>
          )}
          {responded.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>History</Text>
              {responded.map((r) => (
                <ReservationRow key={r.id} item={r} showActions={false} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 16, marginBottom: 8 },
  row: {
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { fontSize: 24 },
  rowText: { flex: 1 },
  requester: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  message: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: 'rgba(194,74,59,0.1)' },
  declineText: { fontSize: 13, fontWeight: '700', color: COLORS.coral },
  fulfillButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.forest },
  fulfillText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
});
