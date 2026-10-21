import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyDonations } from '../hooks/useApiQueries';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import type { ApiMyDonation, DonationPeriod, DonationStatus } from '../api/donations';

import { TEXT } from '../constants/typography';

const STATUS_STYLE: Record<DonationStatus, { bg: string; color: string; label: string }> = {
  succeeded: { bg: 'rgba(94,133,80,0.15)', color: COLORS.forest, label: '✓ Received' },
  pending: { bg: 'rgba(212,168,83,0.22)', color: COLORS.earthDark, label: 'Pending' },
  failed: { bg: 'rgba(194,74,59,0.12)', color: COLORS.coral, label: 'Failed' },
  refunded: { bg: 'rgba(194,74,59,0.12)', color: COLORS.coral, label: 'Refunded' },
};

const STATUS_FILTERS: { key: DonationStatus; label: string }[] = [
  { key: 'succeeded', label: 'Received' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

const PERIOD_FILTERS: { key: DonationPeriod; label: string }[] = [
  { key: '30d', label: 'Last 30 days' },
  { key: '6m', label: 'Last 6 months' },
  { key: '1y', label: 'Last year' },
];

const SEARCH_DEBOUNCE_MS = 350;

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <TouchableOpacity style={styles.activeChip} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove filter ${label}`}>
      <Text style={styles.activeChipText} numberOfLines={1}>{label}</Text>
      <Text style={styles.activeChipX}>✕</Text>
    </TouchableOpacity>
  );
}

function DonationRow({ d, navigation }: { d: ApiMyDonation; navigation: any }) {
  const status = STATUS_STYLE[d.status] ?? STATUS_STYLE.pending;
  const dimmed = d.status === 'failed' || d.status === 'refunded';
  return (
    <TouchableOpacity onPress={() => navigation.navigate('CampaignDetail', { campaignId: d.campaignId })} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>💚</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{d.campaignTitle}</Text>
          <Text style={styles.meta} numberOfLines={1}>{d.ngoName}</Text>
          <Text style={styles.date}>{formatDate(d.donatedAt)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, dimmed && styles.amountDimmed]}>{formatRupees(d.amountCents)}</Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function MyDonationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const [status, setStatus] = useState<DonationStatus | null>(null);
  const [period, setPeriod] = useState<DonationPeriod | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'amount'>('newest');

  const listQuery = useMyDonations({
    q: debouncedQuery || undefined,
    status: status ?? undefined,
    period: period ?? undefined,
    sort,
  });
  const { data, isLoading, isPlaceholderData, refetch } = listQuery;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const donations = data?.donations ?? [];
  const summary = data?.summary;
  const matchCount = data?.total ?? 0;

  const filtersActive = !!status || !!period || debouncedQuery !== '';
  const clearAll = () => {
    setQuery('');
    setStatus(null);
    setPeriod(null);
    setSort('newest');
  };

  const groups = useMemo(() => {
    const out: { month: string; items: ApiMyDonation[] }[] = [];
    // Amount order breaks the month grouping, so those rows go in one unlabelled group.
    if (sort === 'amount') return [{ month: '', items: donations }];
    for (const d of donations) {
      const key = monthKey(d.donatedAt);
      const last = out[out.length - 1];
      if (last && last.month === key) last.items.push(d);
      else out.push({ month: key, items: [d] });
    }
    return out;
  }, [donations, sort]);

  const hasNoDonationsAtAll = !isLoading && summary != null && summary.allCount === 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Donations</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : hasNoDonationsAtAll ? (
        <EmptyState
          icon="💚"
          title="No donations yet"
          body="Campaigns you donate to will show up here."
          actionLabel="Browse campaigns"
          onAction={() => navigation.navigate('Campaigns')}
        />
      ) : (
        <>
        <ListFilterBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Search campaign or NGO"
          options={[{ key: null, label: 'All' }, ...STATUS_FILTERS.map((f) => ({ key: f.key, label: f.label }))]}
          value={status}
          onChange={setStatus}
          rows={[
            {
              label: 'Period',
              options: [{ key: null, label: 'Any time' }, ...PERIOD_FILTERS.map((f) => ({ key: f.key as string, label: f.label }))],
              value: period,
              onChange: (k) => setPeriod(k as DonationPeriod | null),
            },
            {
              label: 'Sort',
              options: [
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
                { key: 'amount', label: 'Largest' },
              ],
              value: sort,
              onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'amount'),
            },
          ]}
        />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...infiniteScrollProps(listQuery)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {summary && (
            <BorderCard style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>You've given</Text>
              <Text style={styles.summaryAmount}>{formatRupees(summary.totalCents)}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{summary.count}</Text>
                  <Text style={styles.statLabel}>donation{summary.count === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{summary.ngos}</Text>
                  <Text style={styles.statLabel}>NGO{summary.ngos === 1 ? '' : 's'} supported</Text>
                </View>
              </View>
            </BorderCard>
          )}

          <View style={isPlaceholderData ? styles.stale : undefined}>
            {donations.length === 0 ? (
              <View style={styles.noMatch}>
                <Text style={styles.noMatchTitle}>No donations match</Text>
                {filtersActive && (
                  <TouchableOpacity onPress={clearAll} accessibilityRole="button">
                    <Text style={styles.clearAll}>Clear search & filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              groups.map((g) => (
                <View key={g.month}>
                  {g.month ? <Text style={styles.monthLabel}>{g.month}</Text> : null}
                  {g.items.map((d) => (
                    <DonationRow key={d.id} d={d} navigation={navigation} />
                  ))}
                </View>
              ))
            )}
          </View>
          <PageFooter loading={listQuery.isFetchingNextPage} />
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
  headerTitle: { flex: 1, ...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },

  summaryCard: { alignItems: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  summaryAmount: { fontSize: 34, fontWeight: '800', color: COLORS.forest, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1.5, height: 28, backgroundColor: COLORS.warmBrown, opacity: 0.3 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  searchClear: { fontSize: 14, color: COLORS.textMuted },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: COLORS.forest, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  countText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  activeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, flexShrink: 1 },
  activeChipX: { fontSize: 11, color: COLORS.textMuted },
  clearAll: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  applyBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.forest },
  applyText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  stale: { opacity: 0.5 },
  noMatch: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noMatchTitle: { ...TEXT.subheading, color: COLORS.textSecondary },

  monthLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(94,133,80,0.12)' },
  icon: { fontSize: 18 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
  amountDimmed: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
