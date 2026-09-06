import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { AnimatedButton } from './AnimatedButton';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import { useTimeTheme, isNightlikePeriod } from '../../hooks/useTimeTheme';

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
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  return (
    <Sheet visible={visible} onClose={onClose} variant="fade">
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, isNightMode && styles.titleNight]}>{title}</Text>
        <Text style={[styles.message, isNightMode && styles.messageNight]}>{message}</Text>
        <AnimatedButton label={actionLabel} onPress={onClose} variant="primary" size="md" fullWidth style={styles.button} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: SPACING.sm },
  icon: { fontSize: 40, marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, textAlign: 'center' },
  titleNight: { color: ON_DARK_SURFACE.primary },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  messageNight: { color: ON_DARK_SURFACE.secondary },
  button: { marginTop: SPACING.xs },
});
