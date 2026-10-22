import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Sheet } from '../components/common/Sheet';
import { PageFooter } from '../components/common/PageFooter';
import { NurseryRequirementCard } from '../components/nursery/NurseryRequirementCard';
import { useNurseryBulkRequirements } from '../hooks/useApiQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { NurseryRequirementSort, NurseryRequirementTab } from '../api/nursery';

const TABS: { key: NurseryRequirementTab; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'responded', label: 'Responded' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

const SORTS: { key: NurseryRequirementSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'deadline', label: 'Deadline (soonest)' },
  { key: 'nearest', label: 'Nearest to me' },
  { key: 'largest', label: 'Largest quantity' },
];

const DISTANCES = [0, 10, 25, 50, 100];
const QUANTITIES = [0, 50, 200, 1000];

type DateField = 'needed' | 'posted';
type DatePreset = 'any' | 'week' | 'month' | 'thisMonth' | 'custom';

/** Local yyyy-mm-dd (toISOString would shift the day for anyone east or west of UTC). */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The from / to a preset means for a date field: forward-looking for "needed by", backward for "posted". */
function presetRange(preset: DatePreset, field: DateField): { from?: Date; to?: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'week') return field === 'needed' ? { from: start, to: addDays(start, 7) } : { from: addDays(start, -7), to: start };
  if (preset === 'month') return field === 'needed' ? { from: start, to: addDays(start, 30) } : { from: addDays(start, -30), to: start };
  if (preset === 'thisMonth') return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
  return {};
}

const presetLabel = (preset: DatePreset, field: DateField) =>
  preset === 'any'
    ? 'Any time'
    : preset === 'week'
      ? field === 'needed' ? 'Next 7 days' : 'Last 7 days'
      : preset === 'month'
        ? field === 'needed' ? 'Next 30 days' : 'Last 30 days'
        : preset === 'thisMonth'
          ? 'This month'
          : 'Custom range';

function DateButton({ label, value, onChange, min }: { label: string; value: Date | null; onChange: (d: Date) => void; min?: Date | null }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.panelLabel}>{label}</Text>
      <TouchableOpacity style={styles.select} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.selectText, !value && { color: COLORS.textLight }]}>{value ? value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date'}</Text>
        <Text style={styles.selectChevron}>🗓</Text>
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={min ?? undefined}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e, d) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (d) onChange(d);
          }}
        />
      )}
      {Platform.OS === 'ios' && open && (
        <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function NurseryBulkRequirementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim());
  const [tab, setTab] = useState<NurseryRequirementTab>('open');
  const [sort, setSort] = useState<NurseryRequirementSort>('newest');
  const [native, setNative] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [minQty, setMinQty] = useState(0);
  const [dateField, setDateField] = useState<DateField>('needed');
  const [preset, setPreset] = useState<DatePreset>('any');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const range = useMemo(() => (preset === 'custom' ? { from: customFrom ?? undefined, to: customTo ?? undefined } : presetRange(preset, dateField)), [preset, dateField, customFrom, customTo]);

  const query = useMemo(
    () => ({
      search,
      tab,
      sort,
      native,
      inStock,
      radiusKm: radiusKm || undefined,
      minQty: minQty || undefined,
      dateField,
      from: range.from ? ymd(range.from) : undefined,
      to: range.to ? ymd(range.to) : undefined,
    }),
    [search, tab, sort, native, inStock, radiusKm, minQty, dateField, range],
  );

  const listQuery = useNurseryBulkRequirements(query);
  const { data, isLoading, isFetching, refetch } = listQuery;
  const items = data?.items ?? [];
  const counts = data?.counts;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  // What the panel button's badge counts, and what the removable summary chips below the bar list.
  const applied: { key: string; label: string; clear: () => void }[] = [];
  if (native) applied.push({ key: 'native', label: '🌿 Native only', clear: () => setNative(false) });
  if (inStock) applied.push({ key: 'stock', label: '📦 In my stock', clear: () => setInStock(false) });
  if (radiusKm) applied.push({ key: 'radius', label: `🧭 Within ${radiusKm} km`, clear: () => setRadiusKm(0) });
  if (minQty) applied.push({ key: 'qty', label: `${minQty.toLocaleString('en-IN')}+ saplings`, clear: () => setMinQty(0) });
  if (preset !== 'any') {
    const text =
      preset === 'custom'
        ? `${customFrom ? shortDate(customFrom) : '…'} – ${customTo ? shortDate(customTo) : '…'}`
        : presetLabel(preset, dateField);
    applied.push({ key: 'date', label: `${dateField === 'needed' ? 'Needed' : 'Posted'}: ${text}`, clear: () => { setPreset('any'); setCustomFrom(null); setCustomTo(null); } });
  }
  if (sort !== 'newest') applied.push({ key: 'sort', label: `⇅ ${SORTS.find((s) => s.key === sort)?.label}`, clear: () => setSort('newest') });

  const isFiltering = !!search || applied.length > 0;
  const clearAll = () => {
    setSearchText('');
    setNative(false);
    setInStock(false);
    setRadiusKm(0);
    setMinQty(0);
    setPreset('any');
    setCustomFrom(null);
    setCustomTo(null);
    setSort('newest');
  };

  const header = (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchField}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search NGO, species, city or notes"
            placeholderTextColor={COLORS.textLight}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8} accessibilityLabel="Clear search">
              <Text style={styles.clearX}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, (filtersOpen || applied.length > 0) && styles.filterBtnActive]}
          onPress={() => setFiltersOpen((x) => !x)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Filters and sort"
        >
          <View style={{ gap: 3, alignItems: 'center' }}>
            {[18, 12, 6].map((w) => (
              <View key={w} style={{ width: w, height: 2, borderRadius: 1, backgroundColor: filtersOpen || applied.length > 0 ? COLORS.white : COLORS.textSecondary }} />
            ))}
          </View>
          {applied.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{applied.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabWrap}>
        {TABS.map((t) => (
          <Chip key={t.key} label={`${t.label}${counts ? `  ${counts[t.key]}` : ''}`} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {filtersOpen && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Sort by</Text>
          <TouchableOpacity style={styles.select} onPress={() => setSortOpen(true)} activeOpacity={0.8}>
            <Text style={styles.selectText}>{SORTS.find((s) => s.key === sort)?.label}</Text>
            <Text style={styles.selectChevron}>▾</Text>
          </TouchableOpacity>

          <Text style={styles.panelLabel}>Date</Text>
          <View style={styles.segment}>
            {(['needed', 'posted'] as DateField[]).map((f) => (
              <TouchableOpacity key={f} style={[styles.segmentBtn, dateField === f && styles.segmentBtnActive]} onPress={() => setDateField(f)} activeOpacity={0.8}>
                <Text style={[styles.segmentText, dateField === f && styles.segmentTextActive]}>{f === 'needed' ? 'Needed by' : 'Posted on'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipWrap}>
            {(['any', 'week', 'month', 'thisMonth', 'custom'] as DatePreset[]).map((p) => (
              <Chip key={p} label={presetLabel(p, dateField)} active={preset === p} onPress={() => setPreset(p)} />
            ))}
          </View>
          {preset === 'custom' && (
            <View style={styles.dateRow}>
              <DateButton label="From" value={customFrom} onChange={setCustomFrom} />
              <DateButton label="To" value={customTo} onChange={setCustomTo} min={customFrom} />
            </View>
          )}

          <Text style={styles.panelLabel}>Distance from my nursery</Text>
          <View style={styles.chipWrap}>
            {DISTANCES.map((d) => (
              <Chip key={d} label={d ? `${d} km` : 'Any'} active={radiusKm === d} onPress={() => setRadiusKm(d)} />
            ))}
          </View>

          <Text style={styles.panelLabel}>Quantity needed</Text>
          <View style={styles.chipWrap}>
            {QUANTITIES.map((qty) => (
              <Chip key={qty} label={qty ? `${qty.toLocaleString('en-IN')}+` : 'Any'} active={minQty === qty} onPress={() => setMinQty(qty)} />
            ))}
          </View>

          <Text style={styles.panelLabel}>Only show</Text>
          <View style={styles.chipWrap}>
            <Chip label="🌿 Native species" active={native} onPress={() => setNative((x) => !x)} />
            <Chip label="📦 I have stock" active={inStock} onPress={() => setInStock((x) => !x)} />
          </View>
        </View>
      )}

      {applied.length > 0 && !filtersOpen && (
        <View style={styles.appliedRow}>
          {applied.map((a) => (
            <TouchableOpacity key={a.key} style={styles.appliedChip} onPress={a.clear} activeOpacity={0.8} accessibilityLabel={`Remove filter ${a.label}`}>
              <Text style={styles.appliedText}>{a.label}  ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summary}>
          {data ? `${data.total} requirement${data.total === 1 ? '' : 's'}` : ' '}
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

      <ScreenHeader title="Bulk Requirements" subtitle="NGO drives looking for saplings" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <NurseryRequirementCard item={item} onPress={() => navigation.navigate('NurseryBulkRequirementDetail', { requirementId: item.id })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
          ) : isFiltering ? (
            <EmptyState icon="🔎" title="No matches" body="Try a different search or loosen the filters." actionLabel="Clear filters" onAction={clearAll} />
          ) : (
            <EmptyState icon="🤝" title="Nothing here" body="Requirements in this stage will show up here." />
          )
        }
        ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        windowSize={9}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      />

      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        {SORTS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={styles.option}
            onPress={() => {
              setSort(o.key);
              setSortOpen(false);
            }}
          >
            <Text style={[styles.optionText, sort === o.key && styles.optionTextActive]}>{o.label}</Text>
            {sort === o.key ? <Text style={styles.optionTick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SPACING.md },
  controls: { gap: 12, paddingBottom: 12, paddingTop: 4 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: border, borderRadius: 14, paddingHorizontal: 12, height: 46 },
  searchIcon: { fontSize: 14 },
  searchField: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  clearX: { fontSize: 14, color: COLORS.textMuted },
  filterBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterBadge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLORS.golden, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },

  tabWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1.5, borderColor: border, paddingHorizontal: 13, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  panel: { gap: 8, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 14 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  selectText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  selectChevron: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  segment: { flexDirection: 'row', borderWidth: 1.5, borderColor: border, borderRadius: 10, overflow: 'hidden' },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  segmentBtnActive: { backgroundColor: 'rgba(46,158,79,0.14)' },
  segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.forest },
  dateRow: { flexDirection: 'row', gap: 10 },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6 },
  doneText: { fontSize: 14, fontWeight: '800', color: COLORS.forest },

  appliedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  appliedChip: { borderRadius: 999, backgroundColor: 'rgba(46,158,79,0.12)', paddingHorizontal: 11, paddingVertical: 5 },
  appliedText: { fontSize: 11, fontWeight: '700', color: COLORS.forest },

  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  summary: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  clearAll: { fontSize: 12, fontWeight: '700', color: COLORS.forest },

  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border },
  optionText: { fontSize: 15, color: COLORS.textPrimary },
  optionTextActive: { fontWeight: '800', color: COLORS.forest },
  optionTick: { fontSize: 16, color: COLORS.forest, fontWeight: '800' },
});
