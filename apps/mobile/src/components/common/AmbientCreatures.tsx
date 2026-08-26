import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from './AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import type { TimePeriod } from '../../hooks/useTimeTheme';

const { width: SW } = Dimensions.get('window');

/**
 * Shared ambient-creature layer: birds by day, fireflies at night. Both Home and Forest render
 * this so the "morning uses birds, night uses fireflies" rule stays consistent across screens
 * instead of each screen reimplementing its own swap logic. Reduce-motion aware — settles to a
 * calm static frame instead of looping when the user has motion reduced.
 */

export interface BirdConfig {
  direction: 'left' | 'right';
  y: number;
  delay: number;
  duration: number;
}

const DEFAULT_BIRD_CONFIGS: BirdConfig[] = [
  { direction: 'right', y: 70, delay: 0, duration: 14000 },
  { direction: 'left', y: 130, delay: 3000, duration: 16000 },
  { direction: 'right', y: 195, delay: 7000, duration: 13000 },
  { direction: 'left', y: 45, delay: 10000, duration: 17000 },
];

function AmbientBird({ direction, y, delay, duration }: BirdConfig) {
  const startX = direction === 'right' ? -40 : SW + 40;
  const endX = direction === 'right' ? SW + 40 : -40;
  const restX = SW * (direction === 'right' ? 0.35 : 0.65);
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      // A bird resting mid-sky instead of endlessly sweeping the screen.
      translateX.value = withTiming(restX, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400 });
      return;
    }

    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(endX, { duration, easing: Easing.linear }), -1, false)
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(-10, { duration: duration * 0.2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scaleX: direction === 'right' ? -1 : 1 },
    ],
  }));

  return (
    <Animated.View style={[styles.bird, { top: y }, style]}>
      <Text style={styles.birdEmoji}>🐦</Text>
    </Animated.View>
  );
}

export function AmbientBirds({ configs = DEFAULT_BIRD_CONFIGS }: { configs?: BirdConfig[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {configs.map((b, i) => (
        <AmbientBird key={i} {...b} />
      ))}
    </View>
  );
}

const FIREFLY_COLORS = ['#D4A853', '#E8B84B', '#FFD700'];

interface FireflyConfig {
  x: number;
  y: number;
  delay: number;
  color: string;
}

function AmbientFirefly({ x, y, delay, color }: FireflyConfig) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      // A firefly glowing quietly in place instead of wandering/blinking.
      translateX.value = withTiming(0, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400 });
      opacity.value = withTiming(0.6, { duration: 400 });
      return;
    }

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(18, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-8, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 + Math.random() * 400 }),
          withTiming(1, { duration: 500 + Math.random() * 700 }),
          withTiming(0.1, { duration: 350 + Math.random() * 350 }),
          withTiming(0.1, { duration: 300 + Math.random() * 500 })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.firefly, { left: x, top: y, backgroundColor: color, shadowColor: color }, style]}
    />
  );
}

export function AmbientFireflies({
  count = 9,
  areaHeight = 400,
}: {
  count?: number;
  areaHeight?: number;
}) {
  const fireflies = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * SW,
        y: 40 + Math.random() * areaHeight,
        delay: Math.random() * 2000,
        color: FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
      })),
    [count, areaHeight]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {fireflies.map((f, i) => (
        <AmbientFirefly key={i} {...f} />
      ))}
    </View>
  );
}

/** Top-level swap: birds by day, fireflies at night/late-night. */
export function AmbientCreatures({
  period,
  birdConfigs,
  fireflyCount,
  fireflyAreaHeight,
}: {
  period: TimePeriod;
  birdConfigs?: BirdConfig[];
  fireflyCount?: number;
  fireflyAreaHeight?: number;
}) {
  const isNight = period === 'night' || period === 'lateNight';
  return isNight ? (
    <AmbientFireflies count={fireflyCount} areaHeight={fireflyAreaHeight} />
  ) : (
    <AmbientBirds configs={birdConfigs} />
  );
}

const styles = StyleSheet.create({
  bird: {
    position: 'absolute',
  },
  birdEmoji: {
    fontSize: 20,
  },
  firefly: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
