import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useTimeTheme, isNightlikePeriod } from '../../hooks/useTimeTheme';

const { height: SH } = Dimensions.get('window');

/**
 * Consolidated bottom-sheet / modal wrapper — shared corner radius, padding, header, close
 * button, and backdrop behavior across the app instead of each screen hand-rolling its own
 * `Modal`. `variant="slideUp"` behaves like a bottom sheet (handle + slide-in), `variant="fade"`
 * centers a card. Reduce-motion aware: falls back to a plain fade regardless of variant.
 */

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'slideUp' | 'fade';
  scrollable?: boolean;
  maxHeight?: number;
  /**
   * 'auto' (default) picks light/night-dark chrome from the time-of-day theme, same as before.
   * 'dark' forces the night-mode chrome (light text, translucent handle/close button) regardless
   * of time of day — for content that's always a dark surface (e.g. a picker over a night scene),
   * not just at night. Pair with `surfaceColor` to override the actual background hex/rgba.
   */
  surface?: 'auto' | 'dark';
  surfaceColor?: string;
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  variant = 'slideUp',
  scrollable = false,
  maxHeight,
  surface = 'auto',
  surfaceColor,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const effectiveAnimation = reduceMotion ? 'fade' : variant === 'slideUp' ? 'slide' : 'fade';
  const { period } = useTimeTheme();
  const isNightMode = surface === 'dark' ? true : isNightlikePeriod(period);

  const Content = scrollable ? ScrollView : View;
  const contentProps = scrollable
    ? { contentContainerStyle: styles.scrollContent, showsVerticalScrollIndicator: false }
    : { style: styles.content };

  return (
    <Modal visible={visible} transparent animationType={effectiveAnimation} onRequestClose={onClose}>
      <View style={[styles.backdrop, variant === 'fade' && styles.backdropCentered]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            variant === 'slideUp' ? styles.sheet : styles.card,
            isNightMode && styles.surfaceNight,
            isNightMode && surfaceColor ? { backgroundColor: surfaceColor } : null,
            { paddingBottom: variant === 'slideUp' ? Math.max(insets.bottom, SPACING.md) : SPACING.lg },
            maxHeight ? { maxHeight } : variant === 'slideUp' ? { maxHeight: SH * 0.85 } : null,
          ]}
        >
          {variant === 'slideUp' && <View style={[styles.handle, isNightMode && styles.handleNight]} />}
          {title ? (
            <View style={styles.headerRow}>
              <Text style={[styles.title, isNightMode && styles.titleNight]} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeButton, isNightMode && styles.closeButtonNight]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={[styles.closeIcon, isNightMode && styles.titleNight]}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <Content {...(contentProps as any)}>{children}</Content>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.lg,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.sand,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  closeIcon: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  content: {
    paddingBottom: SPACING.md,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  surfaceNight: {
    backgroundColor: COLORS.nightSky,
  },
  titleNight: {
    color: ON_DARK_SURFACE.primary,
  },
  handleNight: {
    backgroundColor: ON_DARK_SURFACE.muted,
  },
  closeButtonNight: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
