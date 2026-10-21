import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ------------------------------------------------------------------ hooks

/** 0 until `active`, then counts up to `target` – replays every time the slide becomes active again. */
export function useActiveNumber(target: number, active: boolean, duration = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, active, duration]);
  return value;
}

// ------------------------------------------------------------------ pager

/**
 * Full-height slides you swipe through vertically (no sideways scrolling), with dots down the
 * right edge. Each page receives `active` so its animations replay when you arrive on it.
 */
export function StoryPager({ pages }: { pages: ((active: boolean) => React.ReactNode)[] }) {
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (height <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.y / height);
    if (i !== index) setIndex(Math.max(0, Math.min(pages.length - 1, i)));
  };

  return (
    <View style={styles.pagerWrap} onLayout={onLayout}>
      {height > 0 && (
        <ScrollView
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={height}
          snapToAlignment="start"
        >
          {pages.map((render, i) => (
            <View key={i} style={{ height }}>
              {render(i === index)}
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.dots} pointerEvents="none">
        {pages.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ slide frame

export function StorySlide({
  colors,
  eyebrow,
  scene,
  value,
  format,
  caption,
  change,
  invert,
  active,
  last,
  children,
}: {
  colors: [string, string];
  eyebrow: string;
  scene?: React.ReactNode;
  value?: number;
  format?: (n: number) => string;
  caption?: string;
  change?: number | 'new' | null;
  invert?: boolean;
  active: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  const shown = useActiveNumber(value ?? 0, active);
  let delta: string | null = null;
  let good = true;
  if (change === 'new') delta = '✨ New this period';
  else if (typeof change === 'number' && change !== 0) {
    good = invert ? change < 0 : change > 0;
    delta = `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs previous period`;
  }
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = active ? withDelay(150, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })) : 0;
  }, [active]);
  const textStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 24 }] }));

  return (
    <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.slide}>
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.scene}>{scene}</View>
      <Animated.View style={[styles.slideText, textStyle]}>
        {value !== undefined && format && (
          <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>
            {format(Math.round(shown))}
          </Text>
        )}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        {delta && (
          <View style={[styles.deltaPill, { backgroundColor: good ? 'rgba(255,255,255,0.25)' : 'rgba(194, 74, 59, 0.8)' }]}>
            <Text style={styles.deltaText}>{delta}</Text>
          </View>
        )}
        {children}
      </Animated.View>
      {!last && <Text style={styles.swipe}>⌃  swipe up</Text>}
    </LinearGradient>
  );
}

// ------------------------------------------------------------------ scenes

function PopItem({ emoji, index, active, size }: { emoji: string; index: number; active: boolean; size: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = active ? withDelay(Math.min(index * 45, 1400), withSpring(1, { damping: 7, stiffness: 160 })) : 0;
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: s.value }));
  return <Animated.Text style={[{ fontSize: size }, style]}>{emoji}</Animated.Text>;
}

/** Emoji that pop in one after another – a forest, a crowd. `count` is capped so it always fits. */
export function PopGrid({ emojis, count, active, size = 30, cap = 28 }: { emojis: string[]; count: number; active: boolean; size?: number; cap?: number }) {
  const n = Math.min(count, cap);
  const items = useMemo(() => Array.from({ length: n }, (_, i) => emojis[i % emojis.length]), [n, emojis]);
  if (n === 0) return <Text style={styles.emptyScene}>🌱</Text>;
  return (
    <View style={styles.popGrid}>
      {items.map((e, i) => (
        <PopItem key={i} emoji={e} index={i} active={active} size={size} />
      ))}
      {count > cap && <Text style={styles.moreText}>+{count - cap}</Text>}
    </View>
  );
}

function Coin({ delay, left, active, travel }: { delay: number; left: number; active: boolean; travel: number }) {
  const y = useSharedValue(-30);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      y.value = -30;
      o.value = 0;
      return;
    }
    y.value = withDelay(delay, withRepeat(withTiming(travel, { duration: 1300, easing: Easing.in(Easing.quad) }), -1, false));
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 150 }), withTiming(1, { duration: 900 }), withTiming(0, { duration: 250 })), -1, false));
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return <Animated.Text style={[styles.coin, { left }, style]}>🪙</Animated.Text>;
}

/** A jar that fills with gold while coins drop in. `fill` is 0–1. */
export function Jar({ fill, active }: { fill: number; active: boolean }) {
  const level = useSharedValue(0);
  useEffect(() => {
    level.value = active ? withDelay(300, withTiming(Math.max(0.08, Math.min(1, fill)), { duration: 1500, easing: Easing.out(Easing.cubic) })) : 0;
  }, [active, fill]);
  const liquid = useAnimatedStyle(() => ({ height: `${level.value * 100}%` as any }));
  return (
    <View style={styles.jarWrap}>
      <View style={styles.jarLid} />
      <View style={styles.jar}>
        <Animated.View style={[styles.liquid, liquid]}>
          <LinearGradient colors={['#FFE08A', '#E8B84B']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Text style={styles.jarGlyph}>💚</Text>
      </View>
      <Coin delay={0} left={34} active={active} travel={92} />
      <Coin delay={450} left={70} active={active} travel={92} />
      <Coin delay={900} left={104} active={active} travel={92} />
    </View>
  );
}

function Heart({ delay, left, active }: { delay: number; left: number; active: boolean }) {
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      y.value = 0;
      o.value = 0;
      return;
    }
    y.value = withDelay(delay, withRepeat(withTiming(-130, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(1, { duration: 1300 }), withTiming(0, { duration: 600 })), -1, false));
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  return <Animated.Text style={[styles.heart, { left }, style]}>❤️</Animated.Text>;
}

/** Hearts floating upward – adoptions and followers. */
export function Hearts({ active, emoji = '🌱' }: { active: boolean; emoji?: string }) {
  return (
    <View style={styles.heartsWrap}>
      <Text style={styles.heartsCenter}>{emoji}</Text>
      {[10, 52, 94, 136, 28, 118].map((left, i) => (
        <Heart key={left} delay={i * 330} left={left} active={active} />
      ))}
    </View>
  );
}

/** A ring that sweeps to `rate` (0–100) with an emoji in the middle. */
export function Ring({ rate, active, emoji = '🌳', color = '#fff' }: { rate: number; active: boolean; emoji?: string; color?: string }) {
  const size = 150;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = active ? withDelay(250, withTiming(Math.max(0, Math.min(100, rate)) / 100, { duration: 1500, easing: Easing.out(Easing.cubic) })) : 0;
  }, [active, rate]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Text style={styles.ringEmoji}>{emoji}</Text>
    </View>
  );
}

/** Five stars that fill left-to-right up to `rating` (0–5). */
export function Stars({ rating, active }: { rating: number; active: boolean }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = active ? withDelay(300, withTiming(Math.max(0, Math.min(5, rating)) / 5, { duration: 1400, easing: Easing.out(Easing.cubic) })) : 0;
  }, [active, rating]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));
  return (
    <View style={styles.starsWrap}>
      <Text style={styles.starsBase}>☆☆☆☆☆</Text>
      <Animated.View style={[styles.starsFill, fillStyle]}>
        <Text style={styles.starsGold} numberOfLines={1}>
          ★★★★★
        </Text>
      </Animated.View>
    </View>
  );
}

function ConfettiPiece({ left, delay, emoji, active }: { left: number; delay: number; emoji: string; active: boolean }) {
  const y = useSharedValue(-30);
  const o = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      y.value = -30;
      o.value = 0;
      return;
    }
    y.value = withDelay(delay, withTiming(420, { duration: 2400, easing: Easing.in(Easing.quad) }));
    o.value = withDelay(delay, withSequence(withTiming(1, { duration: 200 }), withTiming(1, { duration: 1800 }), withTiming(0, { duration: 400 })));
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${y.value * 0.6}deg` }], opacity: o.value }));
  return <Animated.Text style={[styles.confetti, { left: `${left}%` }, style]}>{emoji}</Animated.Text>;
}

/** One-shot confetti burst for a good period. */
export function Confetti({ active }: { active: boolean }) {
  const pieces = ['🎉', '✨', '🌿', '🎊', '💚', '⭐'];
  return (
    <View style={styles.confettiWrap} pointerEvents="none">
      {Array.from({ length: 16 }, (_, i) => (
        <ConfettiPiece key={i} left={(i * 37) % 92} delay={(i % 8) * 120} emoji={pieces[i % pieces.length]} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pagerWrap: { flex: 1 },
  dots: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { height: 18, backgroundColor: '#fff' },

  slide: { flex: 1, paddingHorizontal: 26, paddingTop: 26, paddingBottom: 30, overflow: 'hidden' },
  orbA: { position: 'absolute', right: -60, top: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)' },
  orbB: { position: 'absolute', left: -70, bottom: 60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.07)' },
  eyebrow: { fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.2 },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slideText: { alignItems: 'center', gap: 6 },
  bigNumber: { fontSize: 58, fontWeight: '900', color: '#fff' },
  caption: { fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.92)', textAlign: 'center', fontWeight: '600' },
  deltaPill: { borderRadius: 100, paddingVertical: 6, paddingHorizontal: 14, marginTop: 8 },
  deltaText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  swipe: { position: 'absolute', bottom: 8, alignSelf: 'center', fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6 },

  popGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, maxWidth: 300 },
  emptyScene: { fontSize: 80, opacity: 0.8 },
  moreText: { fontSize: 20, fontWeight: '900', color: '#fff', alignSelf: 'center' },

  jarWrap: { width: 150, height: 200, alignItems: 'center' },
  jarLid: { width: 70, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.85)', marginBottom: -2, zIndex: 2 },
  jar: { width: 130, height: 170, borderRadius: 30, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  liquid: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  jarGlyph: { position: 'absolute', top: 60, fontSize: 38, opacity: 0.9 },
  coin: { position: 'absolute', top: 6, fontSize: 24, zIndex: 3 },

  heartsWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  heartsCenter: { fontSize: 90 },
  heart: { position: 'absolute', bottom: 30, fontSize: 22 },

  ringEmoji: { position: 'absolute', fontSize: 52 },

  starsWrap: { alignSelf: 'center' },
  starsBase: { fontSize: 46, color: 'rgba(255,255,255,0.45)', letterSpacing: 2 },
  starsFill: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  starsGold: { fontSize: 46, color: '#FFF1A8', letterSpacing: 2 },

  confettiWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 440 },
  confetti: { position: 'absolute', top: 0, fontSize: 22 },
});
