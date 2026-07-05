/**
 * Mascot — public wrapper around the Ollie + Roots Lottie animation.
 * Preserves the same prop API used everywhere in the app (size, mood, animate, etc.)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useTimeTheme, type MascotOutfit } from '../../hooks/useTimeTheme';
import { COLORS } from '../../constants/colors';

type MascotImageMode = 'sleepy' | 'windingUp' | null;

function mascotOutfitToImageMode(mascotOutfit: MascotOutfit): MascotImageMode {
  if (mascotOutfit === 'night') return 'sleepy';
  if (mascotOutfit === 'windingUp') return 'windingUp';
  return null;
}

/** Shared gentle up/down bounce, used both by `Mascot` itself and by `MascotBubble`'s outer
 * container so the speech bubble bounces in sync with the mascot instead of sitting static
 * beside a moving character. */
function useFloatBounce(animate: boolean, amplitude = 8, duration = 2800) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      cancelAnimation(floatY);
      floatY.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(floatY);
  }, [animate]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface MascotProps {
  size?: number;
  mood?: 'happy' | 'excited' | 'calm' | 'encouraging' | 'proud';
  animate?: boolean;
  outfit?: MascotOutfit;
  style?: any;
  talking?: boolean;
  running?: boolean;
  runFromRight?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Mascot({
  size = 120,
  mood: _mood = 'happy',
  animate = true,
  outfit: _outfit,
  style,
  talking: _talking = false,
}: MascotProps) {
  const theme = useTimeTheme();
  const imageMode = mascotOutfitToImageMode(theme.mascotOutfit);
  const floatStyle = useFloatBounce(animate);

  // The new photo mascots are tall (~2:3) full-body portraits — squeezing them into the same
  // square box used for the Lottie animation shrinks them a lot to fit the width. Give image
  // modes a taller box instead so the character stays readably sized. The portraits also have a
  // lot of empty margin baked into the source PNG itself, so 1.5x reserved more vertical scroll
  // space than the character actually needs — 1.2x keeps it readable without the extra gap.
  const boxHeight = imageMode ? size * 1.2 : size;

  return (
    <Animated.View style={[{ width: size, height: boxHeight }, floatStyle, style]}>
      {imageMode === 'sleepy' && (
        <Image
          source={require('../../../assets/characters/night_sleepy_mascots.png')}
          style={{ width: size, height: boxHeight }}
          resizeMode="contain"
        />
      )}
      {imageMode === 'windingUp' && (
        <Image
          source={require('../../../assets/characters/winding_up_mascots.png')}
          style={{ width: size, height: boxHeight }}
          resizeMode="contain"
        />
      )}
      {imageMode === null && (
        <LottieView
          source={require('../../../assets/ollie and roots.json')}
          autoPlay={animate}
          loop
          style={{ width: size, height: size }}
        />
      )}
    </Animated.View>
  );
}

// ─── MascotBubble ─────────────────────────────────────────────────────────────

export function MascotBubble({
  message,
  size = 80,
  mood = 'happy',
  outfit,
}: {
  message: string;
  size?: number;
  mood?: MascotProps['mood'];
  outfit?: MascotOutfit;
}) {
  // The float animation lives on this shared container instead of inside <Mascot/> so the
  // mascot and its speech bubble bounce together as one unit rather than the bubble sitting
  // static beside a moving character.
  const floatStyle = useFloatBounce(true);

  return (
    <Animated.View style={[bub.container, floatStyle]}>
      <Mascot size={size} mood={mood} outfit={outfit} animate={false} />
      <View style={bub.box}>
        <View style={bub.tail} />
        <Text style={bub.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const bub = StyleSheet.create({
  // flex-start (not flex-end) so the box sits level with the top of the mascot's bounding box —
  // that's where the head is on the tall portrait images, not the bottom where the sleeping dog is.
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  box: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 10,
    maxWidth: 170,
    marginTop: 6,
    shadowColor: '#3A2010',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.sand,
  },
  tail: {
    position: 'absolute',
    top: 14,
    left: -8,
    width: 0,
    height: 0,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderRightColor: COLORS.white,
    borderBottomColor: 'transparent',
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});
