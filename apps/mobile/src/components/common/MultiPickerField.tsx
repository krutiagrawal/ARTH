import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { RequiredMark } from './RequiredMark';

interface MultiPickerFieldProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  sheetTitle?: string;
  dark?: boolean;
}

/**
 * Pick-only multi-select: a tap-to-open list with checkmarks, selected values shown as removable
 * chips. Nothing can be typed, so every value is guaranteed to be one of `options`.
 */
export function MultiPickerField({ label, required, placeholder = 'Select', options, values, onChange, sheetTitle, dark }: MultiPickerFieldProps) {
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);

  return (
    <View>
      {label ? (
        <Text style={[styles.label, dark && styles.labelDark]}>
          {label}
          {required ? <RequiredMark dark={dark} /> : null}
        </Text>
      ) : null}

      {values.length > 0 && (
        <View style={styles.chipRow}>
          {values.map((v) => (
            <View key={v} style={[styles.chip, dark ? styles.chipDark : styles.chipLight]}>
              <Text style={[styles.chipText, dark && styles.chipTextDark]} numberOfLines={1}>{v}</Text>
              <TouchableOpacity onPress={() => toggle(v)} hitSlop={8}>
                <Text style={[styles.chipRemove, dark && styles.chipTextDark]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(true)} style={[styles.trigger, dark && styles.triggerDark]}>
        <Text style={[styles.triggerText, dark && styles.triggerTextDark]}>
          {values.length ? '+ Add more' : placeholder}
        </Text>
        <Text style={[styles.triggerText, dark && styles.triggerTextDark]}>⌄</Text>
      </TouchableOpacity>

      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label} variant="slideUp" scrollable>
        <ScrollView>
          {options.map((opt) => {
            const selected = values.includes(opt);
            return (
              <TouchableOpacity key={opt} activeOpacity={0.7} onPress={() => toggle(opt)} style={styles.row}>
                <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{opt}</Text>
                <View style={[styles.box, selected && styles.boxOn]}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.done} onPress={() => setOpen(false)}>
          <Text style={styles.doneText}>Done{values.length ? ` (${values.length})` : ''}</Text>
        </TouchableOpacity>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  labelDark: { color: COLORS.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 240, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipLight: { borderColor: 'rgba(139, 107, 71, 0.30)' },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flexShrink: 1 },
  chipTextDark: { color: COLORS.white },
  chipRemove: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  triggerDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.22)' },
  triggerText: { fontSize: 15, color: COLORS.textPrimary },
  triggerTextDark: { color: ON_DARK_SURFACE.secondary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.12)' },
  rowText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  rowTextSelected: { color: COLORS.forest },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(139,107,71,0.4)', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  tick: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  done: { marginTop: SPACING.md, backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  doneText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
