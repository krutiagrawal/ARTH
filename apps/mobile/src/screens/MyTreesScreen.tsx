import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, Image, LayoutAnimation } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { EmptyState } from '../components/common/EmptyState';
import { useTreesMap, useTreesPaged } from '../hooks/useApiQueries';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { PageFooter } from '../components/common/PageFooter';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { STATUS_META } from '../constants/treeHealth';
import type { TreeHealthStatus } from '../api/plantedTrees';
import type { ApiTree } from '../api/trees';
import { LeafletPinMap, type LeafletPin, type LeafletPinMapHandle } from '../components/map/LeafletPinMap';

import { TEXT } from '../constants/typography';
// Where the map opens before it fits to the user's trees (India-wide; replaced almost immediately).
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];

const GROWTH_STAGE_EMOJI = ['🌱', '🌿', '🌳', '🌲', '🎋'];
const GROWTH_STAGE_LABEL = ['Seedling', 'Sprouting', 'Growing', 'Maturing', 'Flourishing'];

const PAGE = 30;

type HealthFilter = 'all' | TreeHealthStatus;
type SortKey = 'newest' | 'oldest' | 'growth' | 'co2' | 'name';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'growth', label: 'Most grown' },
  { key: 'co2', label: 'Most CO₂' },
  { key: 'name', label: 'A–Z' },
];

function formatAge(tree: ApiTree): string {
  const days = tree.ageDays ?? Math.max(0, Math.floor((Date.now() - new Date(tree.plantedAt).getTime()) / 86400000));
  if (days < 1) return 'Planted today';
  if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'} old`;
  if (days < 730) return `${Math.round(days / 30)} months old`;
  return `${(days / 365).toFixed(1)} years old`;
}

// Full-width row: photo (or growth emoji) on the left, identity + growth in the middle, health and
// CO2 on the right. One row per line so a tree's details never get squeezed into half a screen.
function TreeRow({ tree, onPress }: { tree: ApiTree; onPress: () => void }) {
  const stageIndex = tree.growthStage - 1;
  const health = STATUS_META[tree.healthStatus];
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.thumb}>
        {tree.photoUri ? (
          <Image source={{ uri: tree.photoUri }} style={styles.thumbImage} />
        ) : (
          <Text style={styles.thumbEmoji}>{tree.speciesEmoji || GROWTH_STAGE_EMOJI[stageIndex]}</Text>
        )}
        <View style={styles.stageBadge}>
          <Text style={styles.stageBadgeText}>{GROWTH_STAGE_EMOJI[stageIndex]}</Text>
        </View>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{tree.nickname}</Text>
          <View style={[styles.healthPill, { borderColor: health.color }]}>
            <Text style={[styles.healthPillText, { color: health.color }]} numberOfLines={1}>{health.emoji} {health.label}</Text>
          </View>
        </View>
        <Text style={styles.rowSpecies} numberOfLines={1}>{tree.species} · {formatAge(tree)}</Text>
        <View style={styles.growthRow}>
          <View style={styles.growthBar}>
            <View style={[styles.growthFill, { width: `${(tree.growthStage / 5) * 100}%` }]} />
          </View>
          <Text style={styles.growthLabel}>{GROWTH_STAGE_LABEL[stageIndex]}</Text>
        </View>
        <View style={styles.rowFoot}>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {tree.location ? `📍 ${tree.location.split(',')[0]}` : '📍 Location not set'}
          </Text>
          <Text style={styles.rowMeta}>{'💨'} {(tree.co2Absorbed ?? 0).toFixed(1)} kg</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Display order for the counts row – healthy first (the reassuring headline number), then
// anything that needs attention, "not checked" last since it's an absence-of-signal state.
const COUNT_ORDER: TreeHealthStatus[] = ['healthy', 'struggling', 'dead', 'removed', 'not_checked'];

export function MyTreesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  // Arriving from a fresh planting opens straight on the map of everything planted.
  const [view, setView] = useState<'list' | 'map'>(route?.params?.view === 'map' ? 'map' : 'list');
  const mapRef = useRef<LeafletPinMapHandle>(null);
  // Counts, the total and the map pins cover everything (server-capped at 500); the grid below
  // pages in 30 at a time so a big forest doesn't load in one go.
  const { data: trees, isLoading, refetch } = useTreesMap({ scope: 'mine' });
  const listQuery = useTreesPaged();
  const pagedTrees = useMemo(() => {
    const seen = new Set<string>();
    return (listQuery.data?.pages ?? []).flat().filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  }, [listQuery.data]);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, listQuery.refetch]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HealthFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [visible, setVisible] = useState(PAGE);
  // Search, filter and non-default sorts need every tree, so they run over the full map feed; the
  // untouched default view keeps using the server-paged list.
  const isDefaultView = query.trim() === '' && filter === 'all' && sort === 'newest';

  const filteredTrees = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = (trees ?? []).filter((t) => {
      if (filter !== 'all' && t.healthStatus !== filter) return false;
      if (!q) return true;
      return [t.nickname, t.species, t.location ?? ''].some((f) => f.toLowerCase().includes(q));
    });
    const by: Record<SortKey, (a: ApiTree, b: ApiTree) => number> = {
      newest: (a, b) => new Date(b.plantedAt).getTime() - new Date(a.plantedAt).getTime(),
      oldest: (a, b) => new Date(a.plantedAt).getTime() - new Date(b.plantedAt).getTime(),
      growth: (a, b) => b.growthStage - a.growthStage || (b.ageDays ?? 0) - (a.ageDays ?? 0),
      co2: (a, b) => (b.co2Absorbed ?? 0) - (a.co2Absorbed ?? 0),
      name: (a, b) => a.nickname.localeCompare(b.nickname),
    };
    return out.sort(by[sort]);
  }, [trees, query, filter, sort]);

  useEffect(() => setVisible(PAGE), [query, filter, sort]);
  const shownTrees = isDefaultView ? pagedTrees : filteredTrees.slice(0, visible);

  const counts = useMemo(() => {
    const tally: Record<TreeHealthStatus, number> = {
      not_checked: 0,
      healthy: 0,
      struggling: 0,
      dead: 0,
      removed: 0,
    };
    for (const tree of trees ?? []) tally[tree.healthStatus] += 1;
    return tally;
  }, [trees]);

  const total = trees?.length ?? 0;
  const totalCo2 = useMemo(() => (trees ?? []).reduce((sum, t) => sum + (t.co2Absorbed ?? 0), 0), [trees]);
  const totalOxygen = useMemo(() => (trees ?? []).reduce((sum, t) => sum + (t.oxygenKg ?? 0), 0), [trees]);
  const needsAttention = counts.struggling + counts.not_checked;

  const pins = useMemo<LeafletPin[]>(
    () =>
      (trees ?? [])
        .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
        .map((t) => ({
          id: t.id,
          lat: t.lat,
          lng: t.lng,
          emoji: t.speciesEmoji || GROWTH_STAGE_EMOJI[t.growthStage - 1],
          bg: COLORS.sageLight,
          border: STATUS_META[t.healthStatus].color,
        })),
    [trees],
  );

  // Frame all the user's trees once the map page has loaded (it can't take commands before then).
  useEffect(() => {
    if (view !== 'map' || pins.length === 0) return;
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const timer = setTimeout(() => {
      mapRef.current?.fitBounds([Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]);
    }, 900);
    return () => clearTimeout(timer);
  }, [view, pins]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      {/* Map view fills the whole screen; the header and toggle float over it. */}
      {!isLoading && total > 0 && view === 'map' && (
        <View style={StyleSheet.absoluteFill}>
          <LeafletPinMap
            ref={mapRef}
            pins={pins}
            circles={[]}
            user={null}
            initialCenter={pins[0] ? [pins[0].lng, pins[0].lat] : DEFAULT_CENTER}
            initialZoom={pins[0] ? 12 : 3.5}
            onPinPress={(id) => navigation.navigate('TreePassport', { kind: 'tree', id })}
          />
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 8 }, view === 'map' && total > 0 && styles.headerOverMap]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trees</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isLoading && total > 0 && (
        <View style={styles.toggleRow}>
          {(['list', 'map'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleChip, view === mode && styles.toggleChipActive]}
              activeOpacity={0.8}
              onPress={() => setView(mode)}
            >
              <Text style={[styles.toggleText, view === mode && styles.toggleTextActive]}>
                {mode === 'list' ? '🌳  List' : '🗺️  Map'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : total === 0 ? (
        <EmptyState icon="🌱" title="No trees yet" body="Every tree you plant will show up here with its own story." />
      ) : view === 'map' ? null : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={200}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            if (layoutMeasurement.height + contentOffset.y < contentSize.height - 400) return;
            if (isDefaultView) {
              if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
            } else if (visible < filteredTrees.length) {
              setVisible((v) => v + PAGE);
            }
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{total}</Text>
              <Text style={styles.summaryLabel}>{total === 1 ? 'Tree' : 'Trees'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{totalCo2.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>kg CO₂</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryNum}>{totalOxygen.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>kg O₂</Text>
            </View>
          </View>

          {needsAttention > 0 && filter === 'all' && (
            <TouchableOpacity
              style={styles.attention}
              activeOpacity={0.8}
              onPress={() => setFilter(counts.struggling > 0 ? 'struggling' : 'not_checked')}
            >
              <Text style={styles.attentionEmoji}>{counts.struggling > 0 ? '🥀' : '🩺'}</Text>
              <Text style={styles.attentionText}>
                {counts.struggling > 0
                  ? `${counts.struggling} ${counts.struggling === 1 ? 'tree is' : 'trees are'} struggling – tap to review`
                  : `${counts.not_checked} ${counts.not_checked === 1 ? 'tree hasn’t' : 'trees haven’t'} had a health check`}
              </Text>
              <Text style={styles.attentionChevron}>›</Text>
            </TouchableOpacity>
          )}

          <ListFilterBar
            flush
            query={query}
            onQueryChange={setQuery}
            placeholder="Search by name, species or place"
            options={[
              { key: null, label: `All ${total}` },
              ...COUNT_ORDER.filter((status) => counts[status] > 0).map((status) => ({
                key: status as string,
                label: `${STATUS_META[status].emoji} ${STATUS_META[status].label} ${counts[status]}`,
              })),
            ]}
            value={filter === 'all' ? null : filter}
            onChange={(k) => setFilter((k ?? 'all') as HealthFilter)}
            rows={[
              {
                label: 'Sort',
                options: SORTS.map((o) => ({ key: o.key as string, label: o.label })),
                value: sort,
                onChange: (k) => setSort((k ?? 'newest') as SortKey),
              },
            ]}
          />

          {shownTrees.length === 0 ? (
            <View style={styles.noMatch}>
              <Text style={styles.noMatchEmoji}>{'🔎'}</Text>
              <Text style={styles.noMatchText}>No trees match your search</Text>
              <TouchableOpacity onPress={() => { setQuery(''); setFilter('all'); }}>
                <Text style={styles.noMatchClear}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {shownTrees.map((tree) => (
                <TreeRow
                  key={tree.id}
                  tree={tree}
                  onPress={() => navigation.navigate('TreePassport', { kind: 'tree', id: tree.id })}
                />
              ))}
            </View>
          )}
          <PageFooter loading={isDefaultView && listQuery.isFetchingNextPage} />
          <TouchableOpacity style={styles.plantButton} activeOpacity={0.85} onPress={() => navigation.navigate('PlantTree')}>
            <Text style={styles.plantButtonText}>{'🌱'}  Plant another tree</Text>
          </TouchableOpacity>
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
  toggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  toggleChip: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: COLORS.cream },
  toggleChipActive: { backgroundColor: COLORS.sageDark, borderColor: COLORS.sageDark },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  toggleTextActive: { color: COLORS.white },
  headerOverMap: { backgroundColor: 'rgba(255,248,237,0.92)' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.warmBrown, marginTop: 4, marginBottom: 12 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryNum: { ...TEXT.statSmall, fontSize: 22, color: COLORS.textPrimary },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 28, backgroundColor: 'rgba(160,114,74,0.3)' },
  attention: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.amber, backgroundColor: 'rgba(255,170,40,0.12)', marginBottom: 12 },
  attentionEmoji: { fontSize: 20 },
  attentionText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  attentionChevron: { fontSize: 22, color: COLORS.textSecondary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.warmBrown, marginBottom: 10 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  searchClear: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  chipRow: { gap: 8, paddingBottom: 10, alignItems: 'center' },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.sageDark },
  filterChipActive: { backgroundColor: COLORS.sageDark },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  filterChipTextActive: { color: COLORS.white },
  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  resultsCount: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  sortButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  sortCaret: { fontSize: 12, color: COLORS.textPrimary },
  sortCaretOpen: { transform: [{ rotate: '180deg' }] },
  sortMenu: { borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: COLORS.cream, marginBottom: 10, overflow: 'hidden' },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  sortOptionBorder: { borderTopWidth: 1, borderTopColor: 'rgba(160,114,74,0.25)' },
  sortOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  sortOptionTextActive: { fontWeight: '800', color: COLORS.sageDark },
  sortCheck: { fontSize: 14, fontWeight: '800', color: COLORS.sageDark },
  list: { gap: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  thumb: { width: 76, height: 76, borderRadius: 16, backgroundColor: 'rgba(143,174,125,0.25)', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: 76, height: 76, borderRadius: 16 },
  thumbEmoji: { fontSize: 36 },
  stageBadge: { position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.cream, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  stageBadgeText: { fontSize: 13 },
  rowBody: { flex: 1, justifyContent: 'center', gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowName: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  rowSpecies: { fontSize: 12, color: COLORS.textSecondary },
  growthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  growthBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(160,114,74,0.2)', overflow: 'hidden' },
  growthFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.sageDark },
  growthLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  rowFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowMeta: { fontSize: 11, color: COLORS.textSecondary, flexShrink: 1 },
  healthPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5 },
  healthPillText: { fontSize: 10, fontWeight: '700' },
  noMatch: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  noMatchEmoji: { fontSize: 34 },
  noMatchText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  noMatchClear: { fontSize: 13, fontWeight: '800', color: COLORS.sageDark, marginTop: 4 },
  plantButton: { marginTop: 18, paddingVertical: 14, borderRadius: 999, backgroundColor: COLORS.sageDark, alignItems: 'center' },
  plantButtonText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
});
