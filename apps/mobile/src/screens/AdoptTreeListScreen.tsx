import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { SlidingSegment } from '../components/common/SlidingSegment';
import { OutlineChip } from '../components/common/OutlineChip';
import { AdoptionStatusPill } from '../components/adopt/AdoptionStatusPill';
import { EmptyState } from '../components/common/EmptyState';
import { resolveMediaUrl } from '../api/client';
import { useMyLocation } from '../hooks/useMyLocation';
import { useAdoptableTrees } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

import { TEXT } from '../constants/typography';

const NEAR_ME_KM = 50;

type SortKey = 'nearest' | 'name';

export function AdoptTreeListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const { coords } = useMyLocation();
  const { data: trees = [], isLoading, refetch } = useAdoptableTrees(coords?.lat, coords?.lng);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [nearMe, setNearMe] = useState(false);
  const [species, setSpecies] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('nearest');
  const [view, setView] = useState<'list' | 'map'>('list');

  // Coming back from the map (back button or its List toggle) slides the outline back to List.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => setView('list'));
    return unsub;
  }, [navigation]);

  const changeView = (next: 'list' | 'map') => {
    setView(next);
    // Let the outline finish sliding to "Map" before the screen changes.
    if (next === 'map') setTimeout(() => navigation.navigate('NgoMap', { fromAdopt: true }), 240);
  };

  const hasDistances = trees.some((t) => t.distanceKm != null);
  const speciesOptions = useMemo(
    () => Array.from(new Set(trees.map((t) => t.speciesName).filter(Boolean))).sort(),
    [trees],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = trees.filter((t) => {
      if (availableOnly && t.isAdopted) return false;
      if (nearMe && !(t.distanceKm != null && t.distanceKm <= NEAR_ME_KM)) return false;
      if (species && t.speciesName !== species) return false;
      if (!q) return true;
      return [t.nickname, t.speciesName, t.ngoName, t.city, t.location]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.nickname.localeCompare(b.nickname);
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });
  }, [trees, query, availableOnly, nearMe, species, sort]);

  const filtersActive = query.trim() !== '' || nearMe || species != null || !availableOnly;
  const clearFilters = () => {
    setQuery('');
    setNearMe(false);
    setSpecies(null);
    setAvailableOnly(true);
  };

  const openTree = (treeId: string) => {
    selection();
    navigation.navigate('AdoptTreeDetail', { treeId });
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
        <Text style={styles.headerTitle} numberOfLines={1}>Adopt a Tree</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('MyAdoptions')}
          style={styles.mineButton}
          accessibilityRole="button"
          accessibilityLabel="My adoptions"
        >
          <Text style={styles.mineButtonText}>Mine</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {/* List | Map */}
        <SlidingSegment
          fill
          style={styles.segment}
          value={view}
          onChange={changeView}
          options={[{ key: 'list', label: '☰ List' }, { key: 'map', label: '🗺️ Map' }]}
        />

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tree, species, NGO or city"
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query !== '' && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters — no outline until selected */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <OutlineChip label="Available only" active={availableOnly} onPress={() => setAvailableOnly((v) => !v)} />
          {hasDistances && <OutlineChip label={`📍 Within ${NEAR_ME_KM} km`} active={nearMe} onPress={() => setNearMe((v) => !v)} />}
          {speciesOptions.map((name) => (
            <OutlineChip key={name} label={name} active={species === name} onPress={() => setSpecies(species === name ? null : name)} />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <Text style={styles.resultCount}>{visible.length} {visible.length === 1 ? 'tree' : 'trees'}</Text>
          <View style={styles.sortGroup}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <SlidingSegment
              small
              value={sort}
              onChange={setSort}
              options={[{ key: 'nearest', label: 'Nearest' }, { key: 'name', label: 'A–Z' }]}
            />
          </View>
        </View>

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && trees.length === 0 && (
          <EmptyState icon="🌳" title="No trees available to adopt yet" body="NGOs list trees near you as they become available." />
        )}
        {!isLoading && trees.length > 0 && visible.length === 0 && (
          <EmptyState
            icon="🔎"
            title="No trees match"
            body="Try a different search or loosen the filters."
            actionLabel={filtersActive ? 'Clear filters' : undefined}
            onAction={filtersActive ? clearFilters : undefined}
          />
        )}

        {visible.map((tree) => {
          const photo = resolveMediaUrl(tree.photoUri);
          const hasCoords = tree.lat != null && tree.lng != null;
          return (
            <TouchableOpacity key={tree.id} activeOpacity={0.85} onPress={() => openTree(tree.id)}>
              <BorderCard style={styles.card}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, styles.coverEmpty]}>
                    <Text style={{ fontSize: 40 }}>🌳</Text>
                  </View>
                )}
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{tree.nickname}</Text>
                  {tree.isAdopted && (
                    <View style={styles.adoptedBadge}>
                      <Text style={styles.adoptedBadgeText}>Adopted</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSubtitle}>
                  {tree.speciesName} ·{' '}
                  <Text
                    style={styles.ngoLink}
                    onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: tree.ngoId })}
                    accessibilityRole="link"
                  >
                    {tree.ngoName}
                  </Text>
                </Text>
                <AdoptionStatusPill status={tree.healthStatus} lastCheckedAt={tree.lastCheckedAt} />
                {!!tree.description && <Text style={styles.description} numberOfLines={2}>{tree.description}</Text>}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText} numberOfLines={1}>
                    📍 {[tree.location, tree.city].filter(Boolean).join(', ') || 'Location TBD'}
                    {tree.distanceKm != null ? ` · ${tree.distanceKm.toFixed(0)} km` : ''}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.adoptBtn, tree.isAdopted && styles.adoptBtnDisabled]}
                    onPress={() => openTree(tree.id)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.adoptBtnText, tree.isAdopted && styles.adoptBtnTextDisabled]}>
                      {tree.isAdopted ? 'View' : '🌱 Adopt'}
                    </Text>
                  </TouchableOpacity>
                  {hasCoords && (
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => navigation.navigate('NgoMap', { focus: { lat: tree.lat, lng: tree.lng } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${tree.nickname} on the map`}
                    >
                      <Text style={styles.mapBtnText}>🗺️ Map</Text>
                    </TouchableOpacity>
                  )}
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
  mineButton: { minWidth: 40, height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  mineButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },

  segment: { marginBottom: 12 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingHorizontal: 12, height: 44,
    borderWidth: 1.5, borderColor: COLORS.warmBrown, marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  searchClear: { fontSize: 14, color: COLORS.textMuted },

  chipRow: { gap: 4, paddingBottom: 4, paddingRight: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  resultCount: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  sortGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 12, color: COLORS.textSecondary },

  card: { marginBottom: 12 },
  cover: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10 },
  coverEmpty: { borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary, flexShrink: 1 },
  adoptedBadge: { borderWidth: 1, borderColor: COLORS.warmBrown, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  adoptedBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  ngoLink: { fontSize: 13, color: COLORS.forest, fontWeight: '700', textDecorationLine: 'underline' },
  description: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  adoptBtn: { flex: 1, height: 38, borderRadius: 12, borderWidth: 2, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  adoptBtnDisabled: { borderWidth: 1.5, opacity: 0.7 },
  adoptBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  adoptBtnTextDisabled: { fontWeight: '600' },
  mapBtn: {
    paddingHorizontal: 16, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.warmBrown,
  },
  mapBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
});
