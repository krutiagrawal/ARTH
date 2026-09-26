import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { IconBadge } from './IconBadge';
import { AnimatedButton } from './AnimatedButton';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';

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
  icon,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  icon?: string;
}) {
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
        {icon ? (
          <IconBadge
            icon={icon}
            color={buttons.some((b) => b.style === 'destructive') ? COLORS.danger : COLORS.sage}
            size={48}
            round
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
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
  icon: { marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary, textAlign: 'center' },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  buttons: { width: '100%', marginTop: SPACING.xs },
  button: { marginTop: SPACING.sm },
});
