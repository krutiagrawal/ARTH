import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Text } from '../common/AppText';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';

const STAGES = ['🌱', '🌿', '🌳'];

/**
 * Shown while a group's app is loading: a sprout that grows through its stages, pulsing dots, and the
 * group's name. If loading fails it says so, with Try again and Back.
 */
export function GroupLoading({
  name,
  failed,
  onRetry,
  onBack,
}: {
  name?: string;
  failed?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  const [stage, setStage] = useState(0);
  const pulse = useSharedValue(0);
  const dots = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    dots.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 800);
    return () => clearInterval(id);
  }, [pulse, dots]);

  const sprout = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + 0.3 * pulse.value }, { translateY: -10 * pulse.value }],
    opacity: 0.75 + 0.25 * pulse.value,
  }));
  const dot = (i: number) =>
    useAnimatedStyle(() => {
      const phase = (dots.value * 3 - i + 3) % 3;
      return { opacity: phase < 1 ? 1 : 0.3, transform: [{ scale: phase < 1 ? 1.2 : 1 }] };
    });
  const d0 = dot(0);
  const d1 = dot(1);
  const d2 = dot(2);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🥀</Text>
          <Text style={styles.title}>Couldn't load the group</Text>
          <Text style={styles.sub}>Check your connection and try again.</Text>
          <View style={styles.actions}>
            {onRetry && <AnimatedButton label="Try again" size="sm" variant="primary" onPress={onRetry} />}
            {onBack && <AnimatedButton label="Back" size="sm" variant="secondary" onPress={onBack} />}
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Animated.View style={sprout}>
            <Text style={styles.bigEmoji}>{STAGES[stage]}</Text>
          </Animated.View>
          <Text style={styles.title}>Loading {name ? name : 'your group'}</Text>
          <View style={styles.dots}>
            <Animated.View style={[styles.dot, d0]} />
            <Animated.View style={[styles.dot, d1]} />
            <Animated.View style={[styles.dot, d2]} />
          </View>
          <Text style={styles.sub}>Gathering the forest, the members and the work you've done together</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  bigEmoji: { fontSize: 72 },
  title: { ...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  sub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.sageDark },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
