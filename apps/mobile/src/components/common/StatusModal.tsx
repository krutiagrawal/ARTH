import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { IconBadge } from './IconBadge';
import { AnimatedButton } from './AnimatedButton';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';

// App-styled stand-in for Alert.alert, for the planting-eligibility flow's info/warning popups
// (location unavailable, not an ARTH-approved spot, request failed) — a plain system alert reads
// jarringly inconsistent against the rest of the app's themed cards.
export function StatusModal({
  visible,
  onClose,
  icon,
  title,
  message,
  actionLabel = 'Got it',
}: {
  visible: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} variant="fade">
      <View style={styles.content}>
        <IconBadge icon={icon} color={COLORS.sage} size={56} round style={styles.icon} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <AnimatedButton label={actionLabel} onPress={onClose} variant="primary" size="md" fullWidth style={styles.button} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: SPACING.sm },
  icon: { marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, textAlign: 'center' },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  button: { marginTop: SPACING.xs },
});
