import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONTS } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import { AnimatedButton } from './AnimatedButton';

/**
 * Shared "nothing here yet" pattern — icon/emoji, a short human explanation, and an optional
 * next action — so no screen renders a blank view when a list is empty.
 */

interface EmptyStateProps {
  icon?: string;
  /** A real illustration to render in place of the emoji — an `<Image>` or an SVG component. */
  illustration?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  tint?: 'light' | 'dark';
  style?: ViewStyle;
}

export function EmptyState({
  icon = '🌱',
  illustration,
  title,
  body,
  actionLabel,
  onAction,
  tint = 'light',
  style,
}: EmptyStateProps) {
  const isDark = tint === 'dark';
  return (
    <View style={[styles.wrap, style]}>
      {illustration ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={[styles.title, { color: isDark ? COLORS.textWhite : COLORS.textPrimary }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: isDark ? COLORS.textWhite : COLORS.textPrimary }]}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <AnimatedButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  icon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  illustration: {
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    lineHeight: 27,
    textAlign: 'center',
  },
  body: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 280,
  },
  action: {
    marginTop: SPACING.md,
  },
});
