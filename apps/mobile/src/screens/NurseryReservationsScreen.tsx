import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusModal } from '../components/common/StatusModal';
import { useNurseryReservations, useFulfillReservation, useDeclineReservation, useNurseryProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import type { ApiNurseryReservation } from '../api/nursery';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { ApiError } from '../api/client';

function ReservationRow({ item, showActions, guard }: { item: ApiNurseryReservation; showActions: boolean; guard: <A extends any[]>(fn: (...a: A) => void) => (...a: A) => void }) {
  const fulfillMutation = useFulfillReservation();
  const declineMutation = useDeclineReservation();
  const confirm = useConfirm();

  const handleFulfill = () => {
    confirm('Fulfil this request?', `Give ${item.quantity} ${item.species ?? 'saplings'} to ${item.requester?.name ?? 'this planter'}. Stock will be reduced.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Fulfil', onPress: guard(() => fulfillMutation.mutate(item.id)) },
    ]);
  };

  const handleDecline = () => {
    confirm('Decline this request?', 'The planter will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: guard(() => declineMutation.mutate(item.id)) },
    ]);
  };

  const statusColor =
    item.status === 'fulfilled' ? COLORS.sage : item.status === 'declined' ? COLORS.coral : item.status === 'cancelled' ? COLORS.textMuted : COLORS.golden;

  return (
    <BorderCard noPadding style={styles.row}>
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
      {fulfillMutation.isError && (
        <Text style={styles.errorText}>
          {fulfillMutation.error instanceof ApiError ? fulfillMutation.error.message : "Couldn't fulfil this reservation. Please try again."}
        </Text>
      )}
    </BorderCard>
  );
}

export function NurseryReservationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  // Pending vs. history is decided by the server, so each tab pages through its own records
  // instead of splitting whatever happens to be loaded (a pending request on page 5 of a mixed
  // list would otherwise show up late, or never).
  const [tab, setTab] = useState<'pending' | 'responded'>('pending');
  const listQuery = useNurseryReservations(tab);
  const { data: reservations = [], isLoading, refetch } = listQuery;
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Reservations"
        subtitle="Requests from planters for your stock"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      <View style={styles.tabRow}>
        {(['pending', 'responded'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabChip, tab === t && styles.tabChipActive]}>
            <Text style={[styles.tabChipText, tab === t && styles.tabChipTextActive]}>{t === 'pending' ? 'Pending' : 'History'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
          }}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
          ListEmptyComponent={
            <EmptyState
              icon="🌱"
              title={tab === 'pending' ? 'No pending requests' : 'No history yet'}
              body={tab === 'pending' ? "When planters request saplings from your stock, they'll show up here." : 'Requests you have fulfilled or declined will appear here.'}
            />
          }
          ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
          renderItem={({ item }) => <ReservationRow item={item} showActions={tab === 'pending'} guard={guard} />}
        />
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.md, paddingTop: 4, paddingBottom: 4 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  tabChipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  tabChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabChipTextActive: { color: COLORS.white },
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
  errorText: { fontSize: 12, color: COLORS.coral, marginTop: 8 },
  declineButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: 'rgba(194,74,59,0.1)' },
  declineText: { fontSize: 13, fontWeight: '700', color: COLORS.coral },
  fulfillButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: COLORS.forest },
  fulfillText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
});
