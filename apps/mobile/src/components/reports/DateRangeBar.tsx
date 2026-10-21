import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

export type RangePreset = 'today' | 'last7' | 'last30' | 'last90' | 'thisYear' | 'all' | 'custom';

export interface DateRangeValue {
  preset: RangePreset;
  /** Local calendar day, inclusive. Undefined with preset 'all'. */
  from?: Date;
  to?: Date;
}

const PRESET_LABEL: Record<RangePreset, string> = {
  today: 'Today',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  last90: 'Last 90 days',
  thisYear: 'This year',
  all: 'All time',
  custom: 'Custom range',
};
const PRESET_ORDER: RangePreset[] = ['today', 'last7', 'last30', 'last90', 'thisYear', 'all', 'custom'];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Resolves a preset to concrete days (today is the last day of every rolling window). */
export function rangeForPreset(preset: RangePreset, custom?: { from?: Date; to?: Date }): DateRangeValue {
  const today = startOfDay(new Date());
  const back = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };
  switch (preset) {
    case 'today':
      return { preset, from: today, to: today };
    case 'last7':
      return { preset, from: back(6), to: today };
    case 'last30':
      return { preset, from: back(29), to: today };
    case 'last90':
      return { preset, from: back(89), to: today };
    case 'thisYear':
      return { preset, from: new Date(today.getFullYear(), 0, 1), to: today };
    case 'all':
      return { preset };
    default:
      return { preset: 'custom', from: custom?.from ?? back(6), to: custom?.to ?? today };
  }
}

/**
 * The query params the report endpoints expect. Sent at local noon so the server's start-of-day /
 * end-of-day snapping lands on the intended calendar day whatever the timezone offset.
 */
export function rangeParams(v: DateRangeValue): { from?: string; to?: string } {
  const noon = (d: Date) => {
    const x = new Date(d);
    x.setHours(12, 0, 0, 0);
    return x.toISOString();
  };
  return { from: v.from ? noon(v.from) : undefined, to: v.to ? noon(v.to) : undefined };
}

const fmt = (d?: Date) => (d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '–');

/** Human description of the selected window, e.g. "12 Oct 2026 – 18 Oct 2026" or "Everything so far". */
export function describeRange(v: DateRangeValue): string {
  if (v.preset === 'all' || !v.from) return 'Everything so far';
  if (v.to && v.from.toDateString() === v.to.toDateString()) return fmt(v.from);
  return `${fmt(v.from)} – ${fmt(v.to)}`;
}

/**
 * One compact "period" box showing the selected window; tapping it opens a sheet with the presets
 * as a plain vertical list (no sideways scrolling) and, for Custom, From / To day pickers.
 * Choosing the same day for both gives a single-day report. Picking a From after To pushes To
 * forward (and vice versa) so the range can never be inverted.
 */
export function DateRangeBar({ value, onChange }: { value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  // While the sheet is open, Custom edits a draft so a half-chosen range doesn't refetch the report.
  const [draft, setDraft] = useState<DateRangeValue>(value);

  const openSheet = () => {
    setDraft(value);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setPicking(null);
  };

  const choose = (key: RangePreset) => {
    if (key === 'custom') {
      setDraft(rangeForPreset('custom', value.preset === 'custom' ? value : undefined));
      return;
    }
    onChange(rangeForPreset(key));
    close();
  };

  const onPicked = (date?: Date) => {
    if (!date) return;
    const day = startOfDay(date);
    const from = draft.from ?? day;
    const to = draft.to ?? day;
    if (picking === 'from') setDraft({ preset: 'custom', from: day, to: day.getTime() > to.getTime() ? day : to });
    else setDraft({ preset: 'custom', from: day.getTime() < from.getTime() ? day : from, to: day });
  };

  return (
    <>
      <TouchableOpacity style={styles.box} onPress={openSheet} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Change period">
        <Text style={styles.boxIcon}>📅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.boxLabel}>{PRESET_LABEL[value.preset]}</Text>
          <Text style={styles.boxValue}>{describeRange(value)}</Text>
        </View>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Sheet visible={open} onClose={close} title="Report period" scrollable>
        <View>
          {PRESET_ORDER.map((key) => {
            const active = draft.preset === 'custom' ? key === 'custom' : value.preset === key;
            return (
              <TouchableOpacity key={key} style={styles.option} onPress={() => choose(key)} activeOpacity={0.7}>
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{PRESET_LABEL[key]}</Text>
                {active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          {draft.preset === 'custom' && (
            <View style={styles.customBlock}>
              <View style={styles.customRow}>
                <TouchableOpacity style={styles.dateBox} onPress={() => setPicking('from')} activeOpacity={0.8}>
                  <Text style={styles.dateLabel}>From</Text>
                  <Text style={styles.dateValue}>{fmt(draft.from)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBox} onPress={() => setPicking('to')} activeOpacity={0.8}>
                  <Text style={styles.dateLabel}>To</Text>
                  <Text style={styles.dateValue}>{fmt(draft.to)}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Pick the same day twice for a single-day report.</Text>

              {picking && (
                <>
                  <DateTimePicker
                    value={(picking === 'from' ? draft.from : draft.to) ?? new Date()}
                    mode="date"
                    maximumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_e, date) => {
                      // Android's dialog closes itself; iOS's spinner stays until Done.
                      if (Platform.OS !== 'ios') setPicking(null);
                      onPicked(date);
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity style={styles.doneBtn} onPress={() => setPicking(null)}>
                      <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  onChange(draft);
                  close();
                }}
              >
                <Text style={styles.applyText}>Show this period</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  boxIcon: { fontSize: 20 },
  boxLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  boxValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  caret: { fontSize: 13, color: COLORS.textMuted },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.12)' },
  optionText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.forest, fontWeight: '800' },
  check: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  customBlock: { marginTop: 14 },
  customRow: { flexDirection: 'row', gap: 10 },
  dateBox: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'rgba(139, 107, 71, 0.30)', paddingVertical: 8, paddingHorizontal: 12 },
  dateLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  dateValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14 },
  doneText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  applyBtn: { marginTop: 14, backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
});
