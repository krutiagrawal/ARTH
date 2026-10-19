import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput } from './AppText';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';

interface ChipListFieldProps {
  label?: string;
  hint?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
  /** e.g. isValidWebsite for link fields – an invalid entry is refused and flagged inline. */
  validate?: (value: string) => boolean;
  validationHint?: string;
  keyboardType?: 'default' | 'url';
  dark?: boolean;
  /** Tappable options (e.g. city names) shown under the input, filtered by what's typed. Already-added values are hidden. */
  suggestions?: string[];
  /** Max characters per entry (default 300). */
  maxItemLength?: number;
}

/**
 * Type-a-value-tap-Add-chip-appears list editor. One component covers every "add several of
 * these" field in the NGO wizard – operating cities/states, social links, and every link array in
 * the proof-of-work section – since they all share the same interaction, just different content.
 */
export function ChipListField({
  label,
  hint,
  placeholder,
  values,
  onChange,
  max = 20,
  validate,
  validationHint,
  keyboardType = 'default',
  dark,
  suggestions,
  maxItemLength = 300,
}: ChipListFieldProps) {
  const [draft, setDraft] = useState('');
  const { selection } = useHaptics();
  const isFull = values.length >= max;
  const draftInvalid = !!draft.trim() && !!validate && !validate(draft.trim());

  const has = useCallback(
    (v: string) => values.some((x) => x.trim().toLowerCase() === v.trim().toLowerCase()),
    [values],
  );

  const addValue = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value || isFull) return;
      if (has(value)) {
        setDraft('');
        return;
      }
      // Invalid entries (e.g. a malformed link) stay in the input with the hint shown, not added.
      if (validate && !validate(value)) return;
      selection();
      onChange([...values, value]);
      setDraft('');
    },
    [isFull, has, validate, selection, values, onChange],
  );

  const add = useCallback(() => addValue(draft), [addValue, draft]);

  const visibleSuggestions = (suggestions ?? [])
    .filter((c) => !has(c) && c.toLowerCase().includes(draft.trim().toLowerCase()))
    .slice(0, 12);

  const removeAt = useCallback(
    (index: number) => {
      selection();
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange, selection],
  );

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text> : null}
      {hint ? <Text style={[styles.hint, dark && styles.hintDark]}>{hint}</Text> : null}

      {values.length > 0 && (
        <View style={styles.chipRow}>
          {values.map((value, index) => (
            <View key={`${value}-${index}`} style={[styles.chip, dark ? styles.chipDark : styles.chipLight]}>
              <Text style={[styles.chipText, dark && styles.chipTextDark]} numberOfLines={1}>
                {value}
              </Text>
              <TouchableOpacity onPress={() => removeAt(index)} hitSlop={8}>
                <Text style={[styles.chipRemove, dark && styles.chipTextDark]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!isFull && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, dark && styles.inputDark]}
            placeholder={placeholder ?? 'Add and tap +'}
            placeholderTextColor={dark ? ON_DARK_SURFACE.muted : COLORS.textLight}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            maxLength={maxItemLength}
            autoCapitalize="none"
            keyboardType={keyboardType === 'url' ? 'url' : 'default'}
          />
          <TouchableOpacity style={styles.addBtn} onPress={add} disabled={!draft.trim()}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isFull && visibleSuggestions.length > 0 && (
        <View style={styles.suggestionRow}>
          {visibleSuggestions.map((c) => (
            <TouchableOpacity key={c} style={[styles.suggestion, dark && styles.suggestionDark]} onPress={() => addValue(c)}>
              <Text style={[styles.suggestionText, dark && styles.chipTextDark]}>+ {c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {draftInvalid && validationHint ? <Text style={styles.fieldError}>{validationHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  labelDark: { color: COLORS.white },
  hint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  hintDark: { color: ON_DARK_SURFACE.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  chipLight: { backgroundColor: 'transparent', borderColor: 'rgba(139, 107, 71, 0.30)' },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flexShrink: 1 },
  chipTextDark: { color: COLORS.white },
  chipRemove: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: COLORS.white,
  },
  addBtn: {
    width: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 20, fontWeight: '800', color: COLORS.forestDeep },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 107, 71, 0.45)',
  },
  suggestionDark: { borderColor: 'rgba(255,255,255,0.4)' },
  suggestionText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  fieldError: { fontSize: 12, color: COLORS.amberLight, marginTop: 4 },
});
