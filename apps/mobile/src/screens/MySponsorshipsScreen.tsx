import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMySponsorships, useSponsorHealthRollup } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { STATUS_META } from '../constants/treeHealth';
import type { ApiMySponsorship } from '../api/drives';

import { TEXT } from '../constants/typography';
const STATUS_COLOR: Record<string, any> = {
  succeeded: { backgroundColor: 'rgba(94,133,80,0.15)' },
  pending: { backgroundColor: 'rgba(212,168,83,0.18)' },
  failed: { backgroundColor: 'rgba(194,74,59,0.12)' },
  refunded: { backgroundColor: 'rgba(194,74,59,0.12)' },
};

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

type Filter = 'all' | ApiMySponsorship['status'];
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];
type Sort = 'newest' | 'oldest' | 'amount';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'amount', label: 'Highest amount' },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

function SponsorshipRow({ s, navigation }: { s: ApiMySponsorship; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('DriveDetail', { driveId: s.driveId })} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{s.speciesName}</Text>
          <Text style={styles.meta}>{s.driveTitle} · {s.ngoName}</Text>
          <Text style={styles.date}>{formatDateTime(s.sponsoredAt)}</Text>
          <Text style={styles.viewDrive}>View drive ›</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>{formatRupees(s.amountCents)}</Text>
          <View style={[styles.statusPill, STATUS_COLOR[s.status]]}>
            <Text style={styles.statusText}>{s.status}</Text>
          </View>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function MySponsorshipsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const listQuery = useMySponsorships();
  const { data: sponsorships, isLoading, refetch } = listQuery;
  const { data: rollup } = useSponsorHealthRollup();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [search, setSearch] = useState('');

  const all = sponsorships ?? [];
  const summary = useMemo(() => {
    const paid = all.filter((x) => x.status === 'succeeded');
    return {
      totalCents: paid.reduce((n, x) => n + x.amountCents, 0),
      plants: paid.length,
      drives: new Set(paid.map((x) => x.driveId)).size,
      ngos: new Set(paid.map((x) => x.ngoName)).size,
    };
  }, [all]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: all.length, succeeded: 0, pending: 0, failed: 0, refunded: 0 };
    for (const x of all) c[x.status] += 1;
    return c;
  }, [all]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = all.filter(
      (x) =>
        (filter === 'all' || x.status === filter) &&
        (!q || x.speciesName.toLowerCase().includes(q) || x.driveTitle.toLowerCase().includes(q) || x.ngoName.toLowerCase().includes(q)),
    );
    return [...rows].sort((a, b) =>
      sort === 'amount'
        ? b.amountCents - a.amountCents
        : (new Date(a.sponsoredAt).getTime() - new Date(b.sponsoredAt).getTime()) * (sort === 'newest' ? -1 : 1),
    );
  }, [all, filter, sort, search]);

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
        <Text style={styles.headerTitle}>My Sponsorships</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !sponsorships || sponsorships.length === 0 ? (
        <EmptyState icon="🌱" title="No sponsorships yet" body="Plants you sponsor on drives will show up here." />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          {...infiniteScrollProps(listQuery)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <BorderCard style={styles.rollupCard}>
            <Text style={styles.totalLabel}>Total sponsored</Text>
            <Text style={styles.totalValue}>{formatRupees(summary.totalCents)}</Text>
            <Text style={styles.totalSub}>
              {summary.plants} plant{summary.plants === 1 ? '' : 's'} · {summary.drives} drive{summary.drives === 1 ? '' : 's'} · {summary.ngos} NGO{summary.ngos === 1 ? '' : 's'}
            </Text>
          </BorderCard>
          {rollup && rollup.totalTrees > 0 ? (
            <BorderCard style={styles.rollupCard}>
              <Text style={styles.rollupTitle}>
                Trees from {rollup.driveCount} drive{rollup.driveCount === 1 ? '' : 's'} you sponsored
              </Text>
              <View style={styles.rollupCountsRow}>
                {(['healthy', 'struggling', 'dead', 'not_checked'] as const)
                  .filter((status) => rollup.counts[status] > 0)
                  .map((status) => (
                    <View key={status} style={[styles.rollupPill, { borderColor: STATUS_META[status].color }]}>
                      <Text style={[styles.rollupPillText, { color: STATUS_META[status].color }]}>
                        {rollup.counts[status]} {STATUS_META[status].label}
                      </Text>
                    </View>
                  ))}
              </View>
            </BorderCard>
          ) : null}
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by plant, drive or NGO"
            placeholderTextColor={COLORS.textMuted}
            autoCorrect={false}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]} activeOpacity={0.8}>
                <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label} ({counts[f.key]})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort</Text>
            {SORTS.map((o) => (
              <TouchableOpacity key={o.key} onPress={() => setSort(o.key)} hitSlop={6}>
                <Text style={[styles.sortOption, sort === o.key && styles.sortOptionActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {visible.length === 0 ? (
            <Text style={styles.noneText}>No matching sponsorships.</Text>
          ) : (
            visible.map((s) => <SponsorshipRow key={s.id} s={s} navigation={navigation} />)
          )}
          <PageFooter loading={listQuery.isFetchingNextPage} />
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
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  rollupCard: { marginBottom: 16 },
  totalLabel: { fontSize: 12, color: COLORS.textSecondary },
  totalValue: { ...TEXT.stat, fontSize: 28, color: COLORS.forest, marginTop: 2 },
  totalSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  search: { marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)', fontSize: 14, color: COLORS.textPrimary },
  chipScroll: { flexGrow: 0, marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)' },
  chipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  sortLabel: { fontSize: 12, color: COLORS.textMuted },
  sortOption: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  sortOptionActive: { color: COLORS.forest, fontWeight: '800', textDecorationLine: 'underline' },
  noneText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
  viewDrive: { fontSize: 11, fontWeight: '700', color: COLORS.forest, marginTop: 6 },
  rollupTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  rollupCountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rollupPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5 },
  rollupPillText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.forest },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
});
