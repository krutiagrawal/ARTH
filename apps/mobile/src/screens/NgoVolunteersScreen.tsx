import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { EmptyState } from '../components/common/EmptyState';
import { StatusModal } from '../components/common/StatusModal';
import { Sheet } from '../components/common/Sheet';
import { VolunteerRow, VolunteerDetails } from '../components/ngo/VolunteerCard';
import { RemoveVolunteerSheet } from '../components/ngo/RemoveVolunteerSheet';
import { useNgoVolunteers, useRemoveNgoVolunteer, useNgoProfile, useMyDrives } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import type { ApiVolunteer, VolunteerFilter, VolunteerSort } from '../api/ngo';

const FILTERS: { key: VolunteerFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Signed up' },
  { key: 'inactive', label: 'Not signed up' },
  { key: 'new', label: 'New' },
  { key: 'regular', label: 'Regulars' },
  { key: 'noshow', label: 'Missed' },
];

const SORTS: { key: VolunteerSort; label: string }[] = [
  { key: 'recent', label: 'Recently active' },
  { key: 'active', label: 'Most drives attended' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'oldest', label: 'Longest with you' },
];

const SEARCH_DEBOUNCE_MS = 350;

/** Three bars that shorten downwards - the usual "filter" glyph, drawn so no icon library is needed. */
function FilterIcon({ color }: { color: string }) {
  return (
    <View style={{ gap: 3, alignItems: 'center' }}>
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 6, height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

export function NgoVolunteersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();

  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VolunteerFilter>('all');
  const [sort, setSort] = useState<VolunteerSort>('recent');
  const [driveId, setDriveId] = useState<string | undefined>();
  const [picker, setPicker] = useState<'sort' | 'drive' | null>(null);
  const [selected, setSelected] = useState<ApiVolunteer | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [removing, setRemoving] = useState<ApiVolunteer | null>(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  const query = useMemo(() => ({ search, filter, sort, driveId }), [search, filter, sort, driveId]);
  const listQuery = useNgoVolunteers(query);
  const { data, isLoading, isFetching, refetch } = listQuery;
  const volunteers = data?.items ?? [];
  const counts = data?.counts;

  const { data: drives = [] } = useMyDrives();
  const driveName = drives.find((d) => d.id === driveId)?.title;

  const removeMutation = useRemoveNgoVolunteer();
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const isFiltering = !!search.trim() || filter !== 'all' || !!driveId;
  // What the collapsed Filters button reports: everything except the search text, which is visible on its own.
  const activeFilterCount = (filter !== 'all' ? 1 : 0) + (driveId ? 1 : 0) + (sort !== 'recent' ? 1 : 0);

  const handleRemoveSubmit = guard(async (reason: string) => {
    if (!removing) return;
    setRemoveError('');
    try {
      await removeMutation.mutateAsync({ userId: removing.userId, reason });
      setRemoving(null);
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Could not remove this volunteer. Please try again.');
    }
  });

  const clearAll = () => {
    setSearchText('');
    setSearch('');
    setFilter('all');
    setDriveId(undefined);
  };

  const header = (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search name, @handle or phone"
          placeholderTextColor={COLORS.textLight}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8} accessibilityLabel="Clear search">
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.filterBtn, (filtersOpen || activeFilterCount > 0) && styles.filterBtnActive]}
        onPress={() => setFiltersOpen((x) => !x)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Filters and sort"
        accessibilityState={{ expanded: filtersOpen }}
      >
        <FilterIcon color={filtersOpen || activeFilterCount > 0 ? COLORS.white : COLORS.textSecondary} />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      </View>

      {filtersOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Show</Text>
          <View style={styles.chipWrap}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity key={f.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f.label}
                    {counts ? `  ${counts[f.key]}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.panelLabel}>Sort by</Text>
          <TouchableOpacity style={styles.select} onPress={() => setPicker('sort')} activeOpacity={0.8}>
            <Text style={styles.selectText}>{SORTS.find((x) => x.key === sort)?.label}</Text>
            <Text style={styles.selectChevron}>▾</Text>
          </TouchableOpacity>

          <Text style={styles.panelLabel}>Drive</Text>
          <TouchableOpacity style={[styles.select, driveId && styles.selectActive]} onPress={() => setPicker('drive')} activeOpacity={0.8}>
            <Text style={[styles.selectText, driveId && styles.selectTextActive]} numberOfLines={1}>{driveName ?? 'All drives'}</Text>
            <Text style={styles.selectChevron}>▾</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summary}>
          {data ? `${data.total} volunteer${data.total === 1 ? '' : 's'}` : ' '}
          {isFiltering && data ? ' match' : ''}
        </Text>
        {isFiltering ? (
          <TouchableOpacity onPress={clearAll} hitSlop={8}>
            <Text style={styles.clearAll}>Clear filters</Text>
          </TouchableOpacity>
        ) : isFetching && !isLoading ? (
          <ActivityIndicator size="small" color={COLORS.sage} />
        ) : null}
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Volunteers</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={volunteers}
        keyExtractor={(v) => v.userId}
        renderItem={({ item }) => <VolunteerRow volunteer={item} onPress={() => setSelected(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.sage} style={styles.loader} />
          ) : isFiltering ? (
            <EmptyState icon="🔎" title="No matches" body="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clearAll} />
          ) : (
            <EmptyState icon="👥" title="No volunteers yet" body="Once people RSVP to your drives, they'll show up here." />
          )
        }
        ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={14}
        windowSize={9}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      />

      <Sheet visible={!!selected} onClose={() => setSelected(null)} scrollable>
        {selected && (
          <VolunteerDetails
            volunteer={selected}
            onOpenProfile={() => {
              const id = selected.userId;
              setSelected(null);
              navigation.navigate('UserPublicProfile', { userId: id });
            }}
            onOpenDrive={(id) => {
              setSelected(null);
              navigation.navigate('DriveDetail', { driveId: id });
            }}
            onRemove={() => {
              setRemoveError('');
              setRemoving(selected);
              setSelected(null);
            }}
          />
        )}
      </Sheet>

      <RemoveVolunteerSheet
        visible={!!removing}
        volunteerName={removing?.name ?? ''}
        upcomingCount={removing?.upcomingCount ?? 0}
        submitting={removeMutation.isPending}
        error={removeError}
        onClose={() => setRemoving(null)}
        onSubmit={handleRemoveSubmit}
      />

      <Sheet visible={picker === 'sort'} onClose={() => setPicker(null)} title="Sort by">
        {SORTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={styles.option}
            onPress={() => {
              setSort(s.key);
              setPicker(null);
            }}
          >
            <Text style={[styles.optionText, sort === s.key && styles.optionTextActive]}>{s.label}</Text>
            {sort === s.key ? <Text style={styles.tick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </Sheet>

      <Sheet visible={picker === 'drive'} onClose={() => setPicker(null)} title="Filter by drive" scrollable>
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            setDriveId(undefined);
            setPicker(null);
          }}
        >
          <Text style={[styles.optionText, !driveId && styles.optionTextActive]}>All drives</Text>
          {!driveId ? <Text style={styles.tick}>✓</Text> : null}
        </TouchableOpacity>
        {drives.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={styles.option}
            onPress={() => {
              setDriveId(d.id);
              setPicker(null);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionText, driveId === d.id && styles.optionTextActive]} numberOfLines={1}>{d.title}</Text>
              <Text style={styles.optionSub}>
                {new Date(d.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                {d.status !== 'upcoming' ? `  ·  ${d.status}` : ''}
              </Text>
            </View>
            {driveId === d.id ? <Text style={styles.tick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </Sheet>

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { ...TEXT.heading, color: COLORS.textPrimary },
  listContent: { paddingHorizontal: 20 },
  loader: { marginTop: 24 },

  controls: { gap: 12, paddingBottom: 6 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: border, borderRadius: 14, paddingHorizontal: 12, height: 46 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  clear: { fontSize: 14, color: COLORS.textMuted },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterBadge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLORS.golden, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  panel: { gap: 8, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 14 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1.5, borderColor: border, paddingHorizontal: 13, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  selectActive: { borderColor: COLORS.forest, backgroundColor: 'rgba(46,158,79,0.10)' },
  selectText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  selectTextActive: { color: COLORS.forest },
  selectChevron: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  summary: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  clearAll: { fontSize: 12, fontWeight: '700', color: COLORS.forest },

  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border },
  optionText: { fontSize: 15, color: COLORS.textPrimary },
  optionTextActive: { fontWeight: '800', color: COLORS.forest },
  optionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tick: { fontSize: 16, color: COLORS.forest, fontWeight: '800' },
});
