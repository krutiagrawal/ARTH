import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';

export interface SelectOption {
  value: string;
  label: string;
  /** Emoji shown before the label — makes a row of chips scannable at a glance. */
  icon?: string;
}

interface BaseProps {
  label?: string;
  hint?: string;
  options: SelectOption[];
  /** Matches the translucent-white chrome used on night-gradient screens (signup wizards). */
  dark?: boolean;
}

interface SingleSelectProps extends BaseProps {
  multi?: false;
  value: string | null | undefined;
  onChange: (value: string) => void;
}

interface MultiSelectProps extends BaseProps {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Tappable chip grid for single- or multi-select choices — no sheet, no typing. Built for signup
 * wizards where every extra tap-to-open-a-modal step is one more chance for someone to give up
 * mid-form; a whole category picker fits and resolves in one glance/tap here.
 */
export function SelectField(props: SingleSelectProps | MultiSelectProps) {
  const { label, hint, options, dark } = props;

  const isSelected = (v: string) => (props.multi ? props.value.includes(v) : props.value === v);
  const toggle = (v: string) => {
    if (props.multi) {
      const set = new Set(props.value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      props.onChange(Array.from(set));
    } else {
      props.onChange(v);
    }
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text> : null}
      {hint ? <Text style={[styles.hint, dark && styles.hintDark]}>{hint}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = isSelected(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => toggle(opt.value)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                dark ? styles.chipDark : styles.chipLight,
                selected && (dark ? styles.chipDarkSelected : styles.chipLightSelected),
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  dark ? styles.chipTextDark : styles.chipTextLight,
                  selected && (dark ? styles.chipTextDarkSelected : styles.chipTextLightSelected),
                ]}
              >
                {opt.icon ? `${opt.icon} ` : ''}
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  labelDark: { color: COLORS.white },
  hint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  hintDark: { color: ON_DARK_SURFACE.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  chipLight: { backgroundColor: 'transparent', borderColor: 'rgba(139, 107, 71, 0.30)' },
  chipLightSelected: { backgroundColor: COLORS.mintLight, borderColor: COLORS.forest },
  chipDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)' },
  chipDarkSelected: { backgroundColor: COLORS.mint, borderColor: COLORS.mint },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextLight: { color: COLORS.textPrimary },
  chipTextLightSelected: { color: COLORS.forest, fontWeight: '700' },
  chipTextDark: { color: COLORS.white },
  chipTextDarkSelected: { color: COLORS.forestDeep, fontWeight: '700' },
});
