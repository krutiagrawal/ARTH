import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyReservations, useCancelReservation } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import type { ApiMyReservation } from '../api/reservations';
import { useConfirm } from '../context/ConfirmDialogContext';

function ReservationCard({ item }: { item: ApiMyReservation }) {
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

  return (
    <BorderCard noPadding style={styles.card}>
      <View style={styles.cardRow}>
        {item.nursery?.logoUrl ? (
          <Image source={{ uri: resolveMediaUrl(item.nursery.logoUrl) }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}><Text style={{ fontSize: 18 }}>🌿</Text></View>
        )}
        <View style={styles.cardText}>
          <Text style={styles.nurseryName}>{item.nursery?.nurseryName ?? 'Nursery'}</Text>
          <Text style={styles.meta}>
            {item.quantity} × {item.species ?? 'saplings'} · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      {item.status === 'pending' && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={cancelMutation.isPending}>
          <Text style={styles.cancelText}>Cancel request</Text>
        </TouchableOpacity>
      )}
    </BorderCard>
  );
}

export function MySaplingReservationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reservations = [], isLoading } = useMyReservations();

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
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {reservations.map((r) => (
            <ReservationCard key={r.id} item={r} />
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  card: { borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  logoPlaceholder: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  nurseryName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cancelButton: { alignSelf: 'flex-start' },
  cancelText: { fontSize: 12, color: COLORS.coral, fontWeight: '700' },
});
