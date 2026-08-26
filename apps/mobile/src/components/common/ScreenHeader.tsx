import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { RADIUS } from '../../constants/theme';

/**
 * Header used by every pushed NGO screen: a back button, a title, and an
 * optional subtitle line beneath. `align="left"` gives the larger left-aligned
 * treatment used by top-level tab screens; the default centers the title
 * between the back button and any right-hand action.
 */
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  align?: 'center' | 'left';
}

export function ScreenHeader({ title, subtitle, onBack, right, align = 'center' }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          align === 'center' && <View style={styles.slot} />
        )}

        <Text style={[styles.title, align === 'center' ? styles.titleCenter : styles.titleLeft]} numberOfLines={1}>
          {title}
        </Text>

        {right ?? (align === 'center' ? <View style={styles.slot} /> : null)}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, align === 'center' && styles.subtitleCenter]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  slot: { width: 40, height: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.beige,
  },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  title: { flex: 1, fontFamily: FONTS.displayBold, fontSize: 23, lineHeight: 31, color: COLORS.textPrimary },
  titleCenter: { textAlign: 'center' },
  titleLeft: { textAlign: 'left' },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  subtitleCenter: { textAlign: 'center' },
});
