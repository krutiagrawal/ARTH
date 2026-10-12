import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';

/**
 * Filter chip with no outline until selected: the brown outline fades/grows in when it's
 * selected and out when it isn't, so toggling a filter animates instead of snapping.
 */
export function OutlineChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [active]);

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + 0.08 * progress.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View pointerEvents="none" style={[styles.outline, outlineStyle]} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  outline: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: 999,
  },
  text: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
});
