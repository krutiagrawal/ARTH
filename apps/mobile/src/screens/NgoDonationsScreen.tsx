import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { DonationJarIllustration } from '../components/common/DonationJarIllustration';
import { SectionHeader } from '../components/common/SectionHeader';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { IconBadge } from '../components/common/IconBadge';
import { useNgoDonations, useNgoDonationsSummary } from '../hooks/useApiQueries';
import type { DonationsFilter } from '../api/ngo';
import { useSlideUp } from '../hooks/useAnimations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { useRequireApproval } from '../hooks/useRequireApproval';

const STATUS_BADGE: Record<string, { icon: string; color: string }> = {
  succeeded: { icon: '💰', color: COLORS.sage },
  pending: { icon: '⏳', color: COLORS.golden },
  failed: { icon: '✕', color: COLORS.coral },
  refunded: { icon: '↩', color: COLORS.textMuted },
};

/** "12 Oct 2026, 3:45 PM" - the exact moment, since the day alone doesn't help match a bank entry. */
function formatDonationTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const STATUS_FILTERS: { key: DonationsFilter['status'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export function NgoDonationsScreen({ navigation }: any) {
  const guard = useRequireApproval();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<DonationsFilter['status'] | 'all'>('all');
  const listQuery = useNgoDonations(statusFilter === 'all' ? {} : { status: statusFilter });
  const { data, isLoading, refetch } = listQuery;
  const { data: summary = [], refetch: refetchSummary } = useNgoDonationsSummary();
  const donations = data?.donations ?? [];
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchSummary]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Donations" subtitle="View and manage all donations" onBack={() => navigation.goBack()} />

      <FlatList
        data={donations}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        // Only the rows near the screen are mounted, so hundreds of loaded donations cost no more than a few.
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        ListHeaderComponent={
          <>
            {summary.length > 0 && (
              <>
                <SectionHeader title="By campaign" />
                <BorderCard style={styles.summaryCard}>
                  {summary.map((row) => (
                    <View key={row.campaignId} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel} numberOfLines={1}>{row.campaignTitle}</Text>
                      <Text style={styles.summaryValue}>₹{(row.totalAmountCents / 100).toLocaleString()} ({row.donationCount})</Text>
                    </View>
                  ))}
                </BorderCard>
              </>
            )}

            <SectionHeader title="All donations" icon="💸" />
            <View style={styles.chipRow}>
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.chip, statusFilter === f.key && styles.chipSelected]} onPress={() => setStatusFilter(f.key)}>
                  <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextSelected]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {data ? <Text style={styles.totalCount}>{data.total} donation{data.total === 1 ? '' : 's'}</Text> : null}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.sage} style={styles.loader} />
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                illustration={<DonationJarIllustration size={200} />}
                title={statusFilter === 'all' ? 'No donations yet' : 'No donations here'}
                body={
                  statusFilter === 'all'
                    ? "When donations come in, you'll see them here."
                    : 'Donations matching this filter will show up here.'
                }
              />
              <AnimatedButton
                label="♥  Accept Donations"
                onPress={guard(() => navigation.navigate('NgoCreateCampaign'))}
                fullWidth
                gradientColors={[COLORS.forest, COLORS.forestDeep]}
                style={styles.emptyCta}
              />
            </View>
          )
        }
        renderItem={({ item: d, index }) => (
          // Staggered entrance only within a page's worth of rows - an index-based delay would make
          // row 200 wait several seconds to appear.
          <FadeInRow delay={(index % 10) * 50}>
            <BorderCard style={styles.card}>
              <View style={styles.cardRow}>
                <IconBadge icon={STATUS_BADGE[d.status]?.icon ?? '💰'} color={STATUS_BADGE[d.status]?.color ?? COLORS.sage} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {d.donor.name}
                    {d.isAnonymous ? '  🕶️' : ''}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    @{d.donor.handle}
                    {d.donor.city ? ` · ${d.donor.city}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountText}>₹{(d.amountCents / 100).toLocaleString('en-IN')}</Text>
                  <Text style={styles.statusText}>{d.status}</Text>
                </View>
              </View>

              <Text style={styles.campaignLine} numberOfLines={1}>🎗️ {d.campaignTitle}</Text>

              {d.message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>“{d.message}”</Text>
                </View>
              ) : null}

              <Text style={styles.footerLine} numberOfLines={2}>
                {formatDonationTime(d.createdAt)}
                {d.receiptNumber ? `  ·  Receipt ${d.receiptNumber}` : ''}
                {d.hasPan ? '  ·  PAN given' : ''}
                {d.isAnonymous ? '  ·  Anonymous to others' : ''}
              </Text>
            </BorderCard>
          </FadeInRow>
        )}
        ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  emptyWrap: { marginTop: 24 },
  emptyCta: { marginTop: 8 },
  summaryCard: { marginBottom: 4, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  campaignLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  messageBox: { marginTop: 8, borderLeftWidth: 3, borderLeftColor: COLORS.sage, paddingLeft: 10, paddingVertical: 2 },
  messageText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', color: COLORS.textPrimary },
  footerLine: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  totalCount: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  chipSelected: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  chipTextSelected: { color: COLORS.white },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amountText: { fontSize: 15, fontWeight: '700', color: COLORS.forest },
  statusText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
