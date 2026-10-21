import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import Svg, { Line, Circle } from 'react-native-svg';

/** Three sliders – the conventional "filters" glyph, drawn so it stays crisp and takes the button's colour. */
function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="6" r="2.6" fill={color} />
      <Circle cx="16" cy="12" r="2.6" fill={color} />
      <Circle cx="8" cy="18" r="2.6" fill={color} />
    </Svg>
  );
}

export interface FilterOption<K extends string> {
  key: K | null;
  label: string;
}

/**
 * Search box plus a row of single-select filter chips, for the NGO Manage lists (drives,
 * campaigns, trees) that grow long. `null` is the "All" option. Filtering happens on the server,
 * so it covers records beyond the pages already loaded.
 */
export function ListFilterBar<K extends string>({
  query,
  onQueryChange,
  placeholder,
  options,
  value,
  onChange,
  rows = [],
  flush,
  mainLabel = 'Show',
}: {
  /** Heading for the main (status) chip group. */
  mainLabel?: string;
  /** Drop the built-in side padding when the parent already pads its content. */
  flush?: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  placeholder: string;
  options: FilterOption<K>[];
  value: K | null;
  onChange: (key: K | null) => void;
  /** Extra single-select chip rows below the main one (category, sort, date range…). `label` is shown as a small prefix. */
  rows?: { label?: string; options: FilterOption<string>[]; value: string | null; onChange: (key: string | null) => void }[];
}) {
  // Filter chips take a lot of room, so they stay tucked away until asked for; only the search box
  // and a "Filters" button (with how many are active) are always visible.
  const [open, setOpen] = useState(false);
  const allRows: { options: FilterOption<string>[]; value: string | null; onChange: (key: string | null) => void }[] = [
    { options, value, onChange: onChange as (key: string | null) => void },
    ...rows,
  ];
  const activeCount = allRows.filter((row) => row.value !== (row.options[0]?.key ?? null)).length;
  const clearAll = () => allRows.forEach((row) => row.onChange(row.options[0]?.key ?? null));

  return (
    <View style={[styles.wrap, flush && { paddingHorizontal: 0 }]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={onQueryChange}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textLight}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={8}>
              <Text style={styles.clear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setOpen((o) => !o)}
          style={[styles.filterBtn, (open || activeCount > 0) && styles.filterBtnActive]}
          accessibilityRole="button"
          accessibilityLabel="Filters"
        >
          <FilterIcon color={open || activeCount > 0 ? COLORS.white : COLORS.textSecondary} />
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {open && (
        <View style={styles.panel}>
          <ChipRow label={mainLabel} options={options} value={value} onChange={onChange} />
          {rows.map((row, i) => (
            <ChipRow key={row.label ?? i} label={row.label} options={row.options} value={row.value} onChange={row.onChange} />
          ))}
          {activeCount > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.clearAll}>
              <Text style={styles.clearAllText}>Reset filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ChipRow<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: FilterOption<K>[];
  value: K | null;
  onChange: (key: K | null) => void;
}) {
  return (
    <View style={styles.group}>
      {label ? <Text style={styles.rowLabel}>{label}</Text> : null}
      <View style={styles.chipWrap}>
        {options.map((o) => {
          const active = value === o.key;
          return (
            <TouchableOpacity key={o.label} onPress={() => onChange(o.key)} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: { fontSize: 14 },
  input: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 2 },
  clear: { fontSize: 14, color: COLORS.textMuted },
  rowLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  filterBtn: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
  },
  filterBtnActive: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  panel: {
    gap: 14,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(139, 107, 71, 0.07)',
  },
  group: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, backgroundColor: COLORS.cream },
  chipActive: { backgroundColor: COLORS.forest },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  clearAll: { alignSelf: 'flex-start' },
  clearAllText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
});
