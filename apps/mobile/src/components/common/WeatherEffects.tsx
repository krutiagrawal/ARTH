import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LeafShape } from './FloatingParticles';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { LEAF_COLORS } from '../../hooks/useParticles';
import type { ApiWeather } from '../../api/weather';

/**
 * Weather-reactive ambient scenery — rain/wind particle layers, plus the `getSceneryMode`
 * classifier that picks between them and the plain floating-leaves fallback. Extracted from
 * `HomeScreen.tsx` (where it originated) so NGO/Admin dashboards can render the same
 * weather-driven scenery on top of their own hero illustration.
 */

const { width: SW, height: SH } = Dimensions.get('window');
const RAIN_FALL_GROUND_Y = SH - 200;

export type SceneryMode = 'leaves' | 'rain' | 'wind';

export function getSceneryMode(weather: ApiWeather | null): SceneryMode {
  if (!weather) return 'leaves';
  if (weather.scene === 'rainy') return 'rain';
  if (weather.temperatureCelsius < 20) return 'wind';
  return 'leaves';
}

function RainDrop({ x, delay, duration, groundY }: { x: number; delay: number; duration: number; groundY: number }) {
  const translateY = useSharedValue(-40);
  const opacity = useSharedValue(0);
  const splashScale = useSharedValue(0);
  const splashOpacity = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      translateY.value = withTiming(groundY * 0.5, { duration: 400 });
      opacity.value = withTiming(0.3, { duration: 400 });
      return;
    }

    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(groundY, { duration, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 120 }),
          withTiming(0.45, { duration: Math.max(duration - 240, 100) }),
          withTiming(0, { duration: 120 })
        ),
        -1,
        false
      )
    );

    const preSplash = Math.max(duration - 160, 0);
    splashScale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: preSplash }),
          withTiming(1.4, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 30 })
        ),
        -1,
        false
      )
    );
    splashOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: preSplash }),
          withTiming(0.55, { duration: 60 }),
          withTiming(0, { duration: 100 })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: '12deg' }],
    opacity: opacity.value,
  }));
  const splashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: splashScale.value }],
    opacity: splashOpacity.value,
  }));

  return (
    <>
      <Animated.View style={[styles.raindrop, { left: x }, dropStyle]} />
      <Animated.View style={[styles.splash, { left: x - 7, top: groundY + 10 }, splashStyle]} />
    </>
  );
}

export function RainEffect({ count = 22 }: { count?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * SW,
        delay: Math.random() * 1500,
        duration: 650 + Math.random() * 450,
      })),
    [count]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <RainDrop key={i} {...d} groundY={RAIN_FALL_GROUND_Y} />
      ))}
    </View>
  );
}

function WindLeaf({ y, delay, duration, color }: { y: number; delay: number; duration: number; color: string }) {
  const translateX = useSharedValue(-40);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      translateX.value = withTiming(SW * 0.5, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400 });
      rotate.value = withTiming(0, { duration: 400 });
      opacity.value = withTiming(0.5, { duration: 400 });
      return;
    }

    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(SW + 40, { duration, easing: Easing.linear }), -1, false)
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(14, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(-10, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: duration * 0.4, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(delay, withTiming(0.85, { duration: 300 }));
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.windLeaf, { top: y }, style]}>
      <LeafShape size={14} color={color} />
    </Animated.View>
  );
}

function GustLine({ y, delay, duration }: { y: number; delay: number; duration: number }) {
  const translateX = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      translateX.value = withTiming(SW * 0.4, { duration: 400 });
      opacity.value = withTiming(0.15, { duration: 400 });
      return;
    }

    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(SW + 100, { duration, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: duration * 0.3 }),
          withTiming(0.3, { duration: duration * 0.4 }),
          withTiming(0, { duration: duration * 0.3 })
        ),
        -1,
        false
      )
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.gustLine, { top: y }, style]} />;
}

export function WindEffect({ count = 6 }: { count?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        y: Math.random() * SW * 0.9 + 40,
        delay: Math.random() * 2000,
        duration: 2200 + Math.random() * 1200,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      })),
    [count]
  );
  const gusts = useMemo(
    () =>
      [0, 1, 2].map(() => ({
        y: Math.random() * SW * 0.9 + 60,
        delay: Math.random() * 1800,
        duration: 1600 + Math.random() * 800,
      })),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {gusts.map((g, i) => (
        <GustLine key={`g-${i}`} {...g} />
      ))}
      {leaves.map((l, i) => (
        <WindLeaf key={i} {...l} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  raindrop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: 'rgba(150,190,230,0.55)',
  },
  splash: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(180,210,240,0.7)',
  },
  windLeaf: {
    position: 'absolute',
  },
  gustLine: {
    position: 'absolute',
    width: 70,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
