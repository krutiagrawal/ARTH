import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { RADIUS, SPACING } from '../../constants/theme';

export type ChoiceTone = 'default' | 'selected' | 'correct' | 'wrong';

interface ChoiceButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ChoiceTone;
  prefix?: string;
  disabled?: boolean;
}

const TONES: Record<ChoiceTone, { bg: string; border: string; text: string }> = {
  default: { bg: 'rgba(255,255,255,0.75)', border: 'rgba(45,90,39,0.18)', text: COLORS.textPrimary },
  selected: { bg: COLORS.mint, border: COLORS.forest, text: COLORS.forestDeep },
  correct: { bg: COLORS.sage, border: COLORS.sageDark, text: COLORS.white },
  wrong: { bg: COLORS.dangerLight, border: COLORS.danger, text: COLORS.dangerDark },
};

/** A full-width answer button for the light game screens (quiz options, step picker, tree picker). */
export function ChoiceButton({ label, onPress, tone = 'default', prefix, disabled }: ChoiceButtonProps) {
  const colors = TONES[tone];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.bg, borderColor: colors.border }]}
      accessibilityRole="button"
    >
      {prefix ? (
        <View style={styles.prefixWrap}>
          <Text style={[styles.prefix, { color: colors.text }]}>{prefix}</Text>
        </View>
      ) : null}
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: SPACING.sm,
  },
  prefixWrap: { marginRight: SPACING.sm, minWidth: 22, alignItems: 'center' },
  prefix: { ...TEXT.subheading },
  label: { ...TEXT.body, flex: 1 },
});
