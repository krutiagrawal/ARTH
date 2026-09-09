import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';

interface ToastProps {
  visible: boolean;
  message: string;
  icon?: string;
  onHide: () => void;
  duration?: number;
}

/**
 * A single-message top banner. Deliberately not a queue/provider — each screen that needs one
 * owns its own `visible` boolean, which keeps this simple for the one-off "friend request
 * accepted" confirmation it was built for.
 */
export function Toast({ visible, message, icon = '🌱', onHide, duration = 2600 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withDelay(
        duration,
        withTiming(0, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onHide)();
        }),
      ),
    );
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }, style]}>
      <View style={styles.pill}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 999,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.forestDeep,
    borderRadius: RADIUS.full,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: '100%',
    ...SHADOWS.lg,
  },
  icon: { fontSize: 16 },
  message: { flexShrink: 1, color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
