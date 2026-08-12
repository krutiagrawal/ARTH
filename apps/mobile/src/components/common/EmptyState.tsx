import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import { AnimatedButton } from './AnimatedButton';

/**
 * Shared "nothing here yet" pattern — icon/emoji, a short human explanation, and an optional
 * next action — so no screen renders a blank view when a list is empty.
 */

interface EmptyStateProps {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  tint?: 'light' | 'dark';
  style?: ViewStyle;
}

export function EmptyState({
  icon = '🌱',
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
      <Text style={styles.icon}>{icon}</Text>
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
  title: {
    ...TYPOGRAPHY.h3,
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
