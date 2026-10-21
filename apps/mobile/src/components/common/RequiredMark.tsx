import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';

/**
 * The red asterisk appended to the label of every mandatory form field. `dark` swaps in a lighter
 * red for night-gradient / dark-sheet surfaces, where the base red would be too dim to read.
 */
export function RequiredMark({ dark }: { dark?: boolean }) {
  return (
    <Text style={[styles.mark, dark && styles.markDark]} accessibilityLabel="required">
      {' *'}
    </Text>
  );
}

/**
 * Small standalone label row for inputs that have no label of their own (login/register screens
 * used placeholder-only inputs, which can't carry a coloured asterisk).
 */
export function FieldLabel({ label, required, dark }: { label: string; required?: boolean; dark?: boolean }) {
  return (
    <Text style={[styles.fieldLabel, dark && styles.fieldLabelDark]}>
      {label}
      {required ? <RequiredMark dark={dark} /> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: { color: COLORS.danger, fontWeight: '700' },
  markDark: { color: COLORS.dangerLight },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginTop: 4 },
  fieldLabelDark: { color: 'rgba(255,255,255,0.85)' },
});
