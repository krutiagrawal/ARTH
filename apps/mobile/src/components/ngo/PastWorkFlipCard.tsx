import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import type { ApiPortfolioEntry } from '../../api/portfolio';

const FLIP_MS = 450;

export function formatPastWorkFullDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * A past-work card that flips on tap: the front is whatever the caller renders (so each screen keeps
 * its own layout and action buttons), the back shows the story and full details. The front stays in
 * normal flow and sets the card's height; the back is laid over it, with the story scrolling if it
 * is longer than the card.
 */
export function PastWorkFlipCard({
  entry,
  cardStyle,
  wrapperStyle,
  children,
}: {
  entry: ApiPortfolioEntry;
  /** Border / radius / margin shared by both faces. */
  cardStyle: StyleProp<ViewStyle>;
  /** Outer spacing (margin) - kept off the faces so the back lines up exactly over the front. */
  wrapperStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [flipped, setFlipped] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    progress.value = withTiming(next ? 1 : 0, { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) });
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${progress.value * 180}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${progress.value * 180 - 180}deg` }],
  }));

  const place = [entry.locationLabel, entry.city].filter(Boolean).join(', ');

  return (
    <View style={wrapperStyle}>
      <Animated.View style={[cardStyle, styles.face, frontStyle]} pointerEvents={flipped ? 'none' : 'auto'}>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={`${entry.title}, tap to read the story`}>
          {children}
          <Text style={styles.frontHint}>Tap to read the story</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[cardStyle, styles.face, styles.back, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        <Pressable style={styles.backInner} onPress={toggle} accessibilityRole="button" accessibilityLabel="Flip card back">
          <Text style={styles.date}>{formatPastWorkFullDate(entry.happenedOn)}</Text>
          <Text style={styles.title} numberOfLines={2}>{entry.title}</Text>
          {place ? <Text style={styles.meta} numberOfLines={2}>📍 {place}</Text> : null}

          <ScrollView style={styles.storyScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <Text style={entry.description ? styles.story : styles.noStory}>
              {entry.description || 'No story added yet.'}
            </Text>
            {entry.partnerOrgs ? <Text style={styles.meta}>🤝 {entry.partnerOrgs}</Text> : null}
          </ScrollView>

          <Text style={styles.hint}>Tap to flip back</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backfaceVisibility: 'hidden' },
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.cream },
  backInner: { flex: 1, padding: 14, gap: 4 },
  date: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.textMuted },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  storyScroll: { flex: 1, marginTop: 6 },
  story: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  noStory: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  frontHint: { fontSize: 11, fontWeight: '700', color: COLORS.forest, textAlign: 'center', paddingBottom: 12 },
  hint: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
});
