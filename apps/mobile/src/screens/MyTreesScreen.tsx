import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { EmptyState } from '../components/common/EmptyState';
import { useTreesMap, useTreesPaged } from '../hooks/useApiQueries';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
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

// Tiles per row — 2 reads comfortably on phones; 3 also fits if tiles should be denser.
const COLUMNS = 2;
const GRID_GAP = 12;

// Flat outlined tile (no fill / glass), matching the app's brown-outline card language.
function TreeTile({ tree, onPress }: { tree: ApiTree; onPress: () => void }) {
  const stageIndex = tree.growthStage - 1;
  const health = STATUS_META[tree.healthStatus];
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.tileEmoji}>{GROWTH_STAGE_EMOJI[stageIndex]}</Text>
      <Text style={styles.tileName} numberOfLines={1}>{tree.nickname}</Text>
      <Text style={styles.tileSpecies} numberOfLines={1}>{tree.species}</Text>
      <View style={styles.growthBar}>
        <View style={[styles.growthFill, { width: `${(tree.growthStage / 5) * 100}%` }]} />
      </View>
      <Text style={styles.tileMeta} numberOfLines={1}>{GROWTH_STAGE_LABEL[stageIndex]}</Text>
      {tree.location ? <Text style={styles.tileMeta} numberOfLines={1}>📍 {tree.location.split(',')[0]}</Text> : null}
      <View style={[styles.healthPill, { borderColor: health.color }]}>
        <Text style={[styles.healthPillText, { color: health.color }]} numberOfLines={1}>{health.emoji} {health.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Display order for the counts row — healthy first (the reassuring headline number), then
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
          {...infiniteScrollProps(listQuery)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <Text style={styles.totalLine}>{total} {total === 1 ? 'tree' : 'trees'}</Text>
          <View style={styles.countsRow}>
            {COUNT_ORDER.filter((status) => counts[status] > 0).map((status) => (
              <View key={status} style={[styles.countPill, { borderColor: STATUS_META[status].color }]}>
                <Text style={[styles.countPillText, { color: STATUS_META[status].color }]}>
                  {counts[status]} {STATUS_META[status].label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {pagedTrees.map((tree) => (
              <TreeTile
                key={tree.id}
                tree={tree}
                onPress={() => navigation.navigate('TreePassport', { kind: 'tree', id: tree.id })}
              />
            ))}
          </View>
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
  toggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  toggleChip: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: COLORS.cream },
  toggleChipActive: { backgroundColor: COLORS.sageDark, borderColor: COLORS.sageDark },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  toggleTextActive: { color: COLORS.white },
  headerOverMap: { backgroundColor: 'rgba(255,248,237,0.92)' },
  totalLine: { ...TEXT.statSmall, fontSize: 22, color: COLORS.textPrimary, marginTop: 4, marginBottom: 10 },
  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  countPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  countPillText: { fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: `${100 / COLUMNS - 2}%`, flexGrow: 1, alignItems: 'center', padding: 14, gap: 4, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  tileEmoji: { fontSize: 34, marginBottom: 2 },
  tileName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  tileSpecies: { fontSize: 12, color: COLORS.textSecondary },
  growthBar: { alignSelf: 'stretch', height: 5, borderRadius: 3, backgroundColor: 'rgba(160,114,74,0.2)', marginVertical: 4, overflow: 'hidden' },
  growthFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.sageDark },
  tileMeta: { fontSize: 11, color: COLORS.textSecondary },
  healthPill: { marginTop: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5 },
  healthPillText: { fontSize: 10, fontWeight: '700' },
});
