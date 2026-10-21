import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

export interface SelectOption {
  value: string | null;
  label: string;
}

/**
 * A labelled select box that opens a sheet of options – used for report filters (drive, campaign,
 * species…). `null` is the "All" option and is shown as the placeholder when selected.
 */
export function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const active = value !== null;
  return (
    <>
      <TouchableOpacity style={[styles.box, active && styles.boxActive]} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, active && styles.valueActive]} numberOfLines={1}>
            {current?.label ?? options[0]?.label ?? 'All'}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </View>
      </TouchableOpacity>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} scrollable>
        <ScrollView>
          {options.map((o) => (
            <TouchableOpacity
              key={o.value ?? 'all'}
              style={styles.option}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, o.value === value && styles.optionTextActive]} numberOfLines={2}>
                {o.label}
              </Text>
              {o.value === value && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'rgba(139, 107, 71, 0.30)', paddingVertical: 8, paddingHorizontal: 12 },
  boxActive: { borderColor: COLORS.forest, backgroundColor: 'rgba(45, 90, 39, 0.06)' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  value: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  valueActive: { color: COLORS.forest, fontWeight: '800' },
  caret: { fontSize: 12, color: COLORS.textMuted },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.12)' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.forest },
  check: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
});
