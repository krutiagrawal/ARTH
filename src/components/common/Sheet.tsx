import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';

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
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  variant = 'slideUp',
  scrollable = false,
  maxHeight,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const effectiveAnimation = reduceMotion ? 'fade' : variant === 'slideUp' ? 'slide' : 'fade';

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
            { paddingBottom: variant === 'slideUp' ? Math.max(insets.bottom, SPACING.md) : SPACING.lg },
            maxHeight ? { maxHeight } : variant === 'slideUp' ? { maxHeight: SH * 0.85 } : null,
          ]}
        >
          {variant === 'slideUp' && <View style={styles.handle} />}
          {title ? (
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeIcon}>✕</Text>
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
});
