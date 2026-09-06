import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { useTimeTheme, isNightlikePeriod } from '../../hooks/useTimeTheme';

export interface ActionSheetOption {
  key: string;
  label: string;
  icon?: string;
  hint?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

/**
 * Bottom-sheet menu, used instead of `Alert.alert` for the post overflow menu.
 *
 * Android's Alert only renders three buttons and silently drops the rest, which would have hidden
 * whichever action landed fourth (Report / Block / Share / Cancel is four). A sheet also gives
 * room for the per-option hint text.
 */
export function ActionSheet({ visible, onClose, title, options }: ActionSheetProps) {
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} variant="slideUp">
      <View style={styles.list}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.option}
            activeOpacity={0.7}
            onPress={() => {
              // Close first so the sheet isn't still animating when a confirm dialog appears
              // on top of it.
              onClose();
              option.onPress();
            }}
          >
            {option.icon ? <Text style={styles.icon}>{option.icon}</Text> : null}
            <View style={styles.optionText}>
              <Text style={[styles.label, isNightMode && styles.labelNight, option.destructive && styles.labelDestructive]}>
                {option.label}
              </Text>
              {option.hint ? <Text style={[styles.hint, isNightMode && styles.hintNight]}>{option.hint}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.cancel} activeOpacity={0.7} onPress={onClose}>
          <Text style={[styles.cancelText, isNightMode && styles.labelNight]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  optionText: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  labelDestructive: { color: COLORS.danger },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cancel: {
    marginTop: SPACING.sm,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  labelNight: { color: ON_DARK_SURFACE.primary },
  hintNight: { color: ON_DARK_SURFACE.secondary },
});
