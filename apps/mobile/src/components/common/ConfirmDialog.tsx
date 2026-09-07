import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { AnimatedButton } from './AnimatedButton';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import { useTimeTheme, isNightlikePeriod } from '../../hooks/useTimeTheme';

export type ConfirmButtonStyle = 'default' | 'cancel' | 'destructive';

export interface ConfirmButton {
  text: string;
  style?: ConfirmButtonStyle;
  onPress?: () => void;
}

// App-styled stand-in for Alert.alert — a plain system alert reads jarringly inconsistent
// against the rest of the app's themed cards. Mounted once at the app root by
// ConfirmDialogContext; screens trigger it through the useConfirm() hook instead of
// importing this directly.
export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  buttons,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
}) {
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  const handlePress = (button: ConfirmButton) => {
    onClose();
    button.onPress?.();
  };

  const buttonVariant = (style?: ConfirmButtonStyle) => {
    if (style === 'destructive') return 'danger' as const;
    if (style === 'cancel') return 'ghost' as const;
    return 'primary' as const;
  };

  return (
    <Sheet visible={visible} onClose={onClose} variant="fade">
      <View style={styles.content}>
        <Text style={[styles.title, isNightMode && styles.titleNight]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, isNightMode && styles.messageNight]}>{message}</Text>
        ) : null}
        <View style={styles.buttons}>
          {buttons.map((button, index) => (
            <AnimatedButton
              key={`${button.text}-${index}`}
              label={button.text}
              onPress={() => handlePress(button)}
              variant={buttonVariant(button.style)}
              size="md"
              fullWidth
              style={styles.button}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: SPACING.sm },
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
  buttons: { width: '100%', marginTop: SPACING.xs },
  button: { marginTop: SPACING.sm },
});
