import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const THUMB_MARGIN = 3;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN * 2;

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  onColor?: string;
  offColor?: string;
  thumbColor?: string;
  disabled?: boolean;
}

/**
 * Custom animated toggle, replacing the stock RN `Switch`. Stock `Switch` already had a solid
 * white `thumbColor` prop set everywhere it was used, so there was no remaining JS-level color
 * bug to fix — the two-tone thumb artifact traced to platform-level native drawable rendering
 * (Android's Switch thumb elevation/shadow against a light track color), which isn't reachable
 * from RN props. Drawing the whole thing ourselves guarantees identical rendering on iOS/Android,
 * matching how GlassCard/AnimatedButton already replace other stock components in this app.
 */
export function Toggle({
  value,
  onValueChange,
  onColor = COLORS.sage,
  offColor = COLORS.sand,
  thumbColor = COLORS.white,
  disabled = false,
}: ToggleProps) {
  const { selection } = useHaptics();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, THUMB_TRAVEL]) },
    ],
  }));

  const handlePress = () => {
    if (disabled) return;
    selection();
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, { backgroundColor: thumbColor }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_MARGIN,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
