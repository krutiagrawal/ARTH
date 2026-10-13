import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useCampaigns } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { CAMPAIGN_CATEGORIES, type ApiCampaign, type CampaignCategory } from '../api/donations';

import { TEXT } from '../constants/typography';

const QUICK_AMOUNTS = [100, 500, 1000];
const DAY_MS = 24 * 60 * 60 * 1000;
const ENDING_SOON_DAYS = 7;
const ALMOST_FUNDED = 0.75;

type SortKey = 'newest' | 'ending' | 'funded' | 'raised';
type QuickFilter = 'ending_soon' | 'almost_funded' | 'open_ended';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'ending', label: 'Ending soon' },
  { key: 'funded', label: 'Most funded' },
  { key: 'raised', label: 'Most raised' },
];

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'ending_soon', label: '⏳ Ending soon' },
  { key: 'almost_funded', label: '🎯 Almost funded' },
  { key: 'open_ended', label: '♾️ No goal' },
];

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

/** Compact money for the summary strip: ₹4.2L, ₹12.5K. */
function formatRupeesCompact(cents: number) {
  const rupees = cents / 100;
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(1)}Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  return `₹${Math.round(rupees)}`;
}

function fundedFraction(c: ApiCampaign): number | null {
  return c.goalAmountCents ? c.raisedAmountCents / c.goalAmountCents : null;
}

function daysLeft(c: ApiCampaign): number | null {
  if (!c.endsAt) return null;
  return Math.max(0, Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / DAY_MS));
}

function daysLeftLabel(days: number) {
  if (days === 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

function donorLine(c: ApiCampaign): string | null {
  if (c.donorCount === 0) return null;
  const others = c.donorCount - c.recentDonors.length;
  const names = c.recentDonors.join(', ');
  if (others > 0) return `${names} and ${others} other${others === 1 ? '' : 's'} donated`;
  return `${names} donated`;
}

function matchesQuickFilter(c: ApiCampaign, filter: QuickFilter): boolean {
  switch (filter) {
    case 'ending_soon': {
      const left = daysLeft(c);
      return left != null && left <= ENDING_SOON_DAYS;
    }
    case 'almost_funded': {
      const f = fundedFraction(c);
      return f != null && f >= ALMOST_FUNDED && f < 1;
    }
    case 'open_ended':
      return c.goalAmountCents == null;
  }
}

function sortCampaigns(list: ApiCampaign[], sort: SortKey): ApiCampaign[] {
  const copy = [...list];
  switch (sort) {
    case 'ending':
      // Campaigns with no end date go last.
      return copy.sort((a, b) => (daysLeft(a) ?? Infinity) - (daysLeft(b) ?? Infinity));
    case 'funded':
      return copy.sort((a, b) => (fundedFraction(b) ?? -1) - (fundedFraction(a) ?? -1));
    case 'raised':
      return copy.sort((a, b) => b.raisedAmountCents - a.raisedAmountCents);
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CampaignsListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading, refetch } = useCampaigns();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [category, setCategory] = useState<CampaignCategory | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [ngoFilter, setNgoFilter] = useState<string | null>(null);

  const ngos = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const c of campaigns) {
      const entry = byId.get(c.ngoId);
      if (entry) entry.count += 1;
      else byId.set(c.ngoId, { id: c.ngoId, name: c.ngoName, count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [campaigns]);

  const totals = useMemo(
    () => ({
      raisedCents: campaigns.reduce((sum, c) => sum + c.raisedAmountCents, 0),
      donors: campaigns.reduce((sum, c) => sum + c.donorCount, 0),
    }),
    [campaigns],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = campaigns.filter((c) => {
      if (ngoFilter && c.ngoId !== ngoFilter) return false;
      if (category && c.category !== category) return false;
      if (quickFilter && !matchesQuickFilter(c, quickFilter)) return false;
      if (q && !`${c.title} ${c.ngoName}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortCampaigns(filtered, sort);
  }, [campaigns, query, sort, category, quickFilter, ngoFilter]);

  const filtersActive = !!(query.trim() || category || quickFilter || ngoFilter);
  const clearFilters = () => {
    setQuery('');
    setCategory(null);
    setQuickFilter(null);
    setNgoFilter(null);
  };

  const openCampaign = (c: ApiCampaign, presetAmount?: number) => {
    selection();
    // Same shape `getCampaign` returns, so the detail screen paints instantly instead
    // of re-fetching data this list screen already has.
    queryClient.setQueryData(['campaigns', c.id], c);
    navigation.navigate('CampaignDetail', { campaignId: c.id, presetAmount });
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>Donate to an NGO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}

        {!isLoading && campaigns.length > 0 && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle}>
                  {campaigns.length} active campaign{campaigns.length === 1 ? '' : 's'} · {formatRupeesCompact(totals.raisedCents)} raised
                </Text>
                {totals.donors > 0 && <Text style={styles.summaryBody}>{totals.donors} donations from the community</Text>}
              </View>
              <TouchableOpacity
                style={styles.myDonationsButton}
                onPress={() => navigation.navigate('MyDonations')}
                accessibilityRole="button"
              >
                <Text style={styles.myDonationsText}>My donations</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search campaigns or NGOs"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.search}
              returnKeyType="search"
              autoCorrect={false}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {QUICK_FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} selected={quickFilter === f.key} onPress={() => setQuickFilter(quickFilter === f.key ? null : f.key)} />
              ))}
              {CAMPAIGN_CATEGORIES.map((c) => (
                <Chip key={c.key} label={`${c.emoji} ${c.label}`} selected={category === c.key} onPress={() => setCategory(category === c.key ? null : c.key)} />
              ))}
            </ScrollView>

            {ngos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {ngos.map((n) => (
                  <Chip key={n.id} label={`${n.name} (${n.count})`} selected={ngoFilter === n.id} onPress={() => setNgoFilter(ngoFilter === n.id ? null : n.id)} />
                ))}
              </ScrollView>
            )}

            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortChips}>
                {SORTS.map((s) => (
                  <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {!isLoading && campaigns.length === 0 && (
          <EmptyState icon="💚" title="No active campaigns yet" body="Verified NGOs will list donation campaigns here." />
        )}
        {!isLoading && campaigns.length > 0 && visible.length === 0 && (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchTitle}>No campaigns match</Text>
            {filtersActive && (
              <TouchableOpacity onPress={clearFilters} accessibilityRole="button">
                <Text style={styles.clearText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {visible.map((c) => {
          const fraction = fundedFraction(c);
          const progress = fraction != null ? Math.min(1, fraction) : null;
          const goalReached = fraction != null && fraction >= 1;
          const left = daysLeft(c);
          const cat = CAMPAIGN_CATEGORIES.find((x) => x.key === c.category);
          const donors = donorLine(c);
          return (
            <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => openCampaign(c)}>
              <BorderCard style={styles.card}>
                {c.coverPhotoUri ? <Image source={{ uri: c.coverPhotoUri }} style={styles.cover} resizeMode="cover" /> : null}

                <View style={styles.badgeRow}>
                  {cat && <Text style={styles.categoryBadge}>{cat.emoji} {cat.label}</Text>}
                  {left != null && (
                    <Text style={[styles.deadlineBadge, left <= ENDING_SOON_DAYS && styles.deadlineBadgeUrgent]}>
                      ⏳ {daysLeftLabel(left)}
                    </Text>
                  )}
                </View>

                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSubtitle}>{c.ngoName}</Text>

                <Text style={styles.raisedText}>
                  {formatRupees(c.raisedAmountCents)}{c.goalAmountCents ? ` raised of ${formatRupees(c.goalAmountCents)}` : ' raised'}
                </Text>
                {progress != null && (
                  <>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.fundedText}>
                      {goalReached
                        ? 'Goal reached 🎉 — more donations still welcome'
                        : `${Math.floor((fraction ?? 0) * 100)}% funded · ${formatRupees(c.goalAmountCents! - c.raisedAmountCents)} to go`}
                    </Text>
                  </>
                )}

                {donors && <Text style={styles.donorText}>💚 {donors}</Text>}

                <View style={styles.quickRow}>
                  {QUICK_AMOUNTS.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.quickButton}
                      onPress={() => openCampaign(c, amt)}
                      accessibilityRole="button"
                      accessibilityLabel={`Donate ${amt} rupees to ${c.title}`}
                    >
                      <Text style={styles.quickText}>₹{amt.toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.quickButton} onPress={() => openCampaign(c)} accessibilityRole="button">
                    <Text style={styles.quickText}>Other</Text>
                  </TouchableOpacity>
                </View>
              </BorderCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  loader: { marginTop: 40 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  summaryText: { flex: 1 },
  summaryTitle: { ...TEXT.subheading, color: COLORS.forest },
  summaryBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  myDonationsButton: { borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage, paddingHorizontal: 12, paddingVertical: 7 },
  myDonationsText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },

  search: {
    height: 44,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.25)',
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  chipRow: { gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage },
  chipSelected: { backgroundColor: COLORS.sage },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.forest },
  chipTextSelected: { color: COLORS.white },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  sortChips: { gap: 8 },

  noMatch: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noMatchTitle: { ...TEXT.subheading, color: COLORS.textSecondary },
  clearText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },

  card: { marginBottom: 12 },
  cover: { height: 140, borderRadius: RADIUS.md, marginBottom: 10, backgroundColor: 'rgba(94,133,80,0.12)' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  categoryBadge: { fontSize: 11, fontWeight: '700', color: COLORS.forest, backgroundColor: 'rgba(94,133,80,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, overflow: 'hidden' },
  deadlineBadge: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, overflow: 'hidden' },
  deadlineBadgeUrgent: { color: COLORS.coral, backgroundColor: 'rgba(255,107,107,0.14)' },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  raisedText: { fontSize: 13, color: COLORS.forest, fontWeight: '600', marginTop: 10 },
  progressTrack: { height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(94,133,80,0.15)', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: RADIUS.full },
  fundedText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  donorText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage },
  quickText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
});
