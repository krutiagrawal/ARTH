/**
 * MascotInteraction — plays the Ollie + Roots Lottie animation during onboarding.
 *
 * Responsibilities
 * ────────────────
 * • Slides the animation in from the right when the page changes.
 * • Runs the typewriter dialogue sequence in sync with a "woof" sound cue.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useSoundSystem } from '../../hooks/useSoundSystem';
import { COLORS } from '../../constants/colors';

const { width: SW } = Dimensions.get('window');

// ─── Dialogue scripts ──────────────────────────────────────────────────────────

interface DialogScript {
  line1: string;
  line2: string;
  woofAfterLine: 1 | 2;
}

export const ONBOARDING_DIALOGS: DialogScript[] = [
  { line1: "Hi! I'm Ollie, your forest guardian! 🌱", line2: "Together we'll plant real trees!",    woofAfterLine: 1 },
  { line1: "Plant every day to build your streak! 🔥", line2: "Roots loves a winning streak!",    woofAfterLine: 1 },
  { line1: "Every photo proves a real tree exists! 🌍", line2: "Roots can smell fresh air from here!", woofAfterLine: 2 },
  { line1: "We're stronger when we grow together! 👥",  line2: "Let's make Earth green again!",    woofAfterLine: 1 },
];

// ─── Phase type ────────────────────────────────────────────────────────────────

type Phase =
  | 'idle'
  | 'entering'
  | 'line1_typing'
  | 'line1_done'
  | 'woofing'
  | 'line2_typing'
  | 'line2_done';

// ─── Scale constants ───────────────────────────────────────────────────────────

const LOTTIE_SIZE = 260;
const BUBBLE_GAP  = 14;

const CHAR_INTERVAL_MS = 38;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MascotInteractionProps {
  pageIndex: number;
  visible?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MascotInteraction({ pageIndex, visible = true }: MascotInteractionProps) {
  const { playSound } = useSoundSystem();
  const script = ONBOARDING_DIALOGS[pageIndex] ?? ONBOARDING_DIALOGS[0];

  const [phase, setPhase]           = useState<Phase>('idle');
  const [displayedText, setDisplayedText] = useState('');

  const mascotX       = useSharedValue(SW);
  const bubbleOpacity = useSharedValue(0);

  const typeTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const seqTimerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const charIndexRef  = useRef(0);
  const currentLineRef = useRef('');

  const clearTimers = useCallback(() => {
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    if (seqTimerRef.current)  clearTimeout(seqTimerRef.current);
  }, []);

  // ── Typewriter ────────────────────────────────────────────────────────────

  const startTyping = useCallback((text: string, onDone: () => void) => {
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    currentLineRef.current = text;
    charIndexRef.current   = 0;
    setDisplayedText('');
    bubbleOpacity.value = withTiming(1, { duration: 200 });

    typeTimerRef.current = setInterval(() => {
      charIndexRef.current += 1;
      const partial = currentLineRef.current.slice(0, charIndexRef.current);
      setDisplayedText(partial);
      if (charIndexRef.current >= currentLineRef.current.length) {
        clearInterval(typeTimerRef.current!);
        onDone();
      }
    }, CHAR_INTERVAL_MS);
  }, []);

  // ── Main sequence ─────────────────────────────────────────────────────────

  const runSequence = useCallback(() => {
    setPhase('entering');
    setDisplayedText('');
    mascotX.value = withSpring(0, { damping: 18, stiffness: 90 });

    seqTimerRef.current = setTimeout(() => {
      setPhase('line1_typing');

      startTyping(script.line1, () => {
        setPhase('line1_done');

        if (script.woofAfterLine === 1) {
          seqTimerRef.current = setTimeout(() => {
            // Woof moment
            playSound('woof');
            setPhase('woofing');

            seqTimerRef.current = setTimeout(() => {
              setPhase('line2_typing');
              startTyping(script.line2, () => {
                setPhase('line2_done');
              });
            }, 1100);
          }, 600);

        } else {
          seqTimerRef.current = setTimeout(() => {
            setPhase('line2_typing');
            startTyping(script.line2, () => {
              setPhase('line2_done');
              // Woof after line2
              seqTimerRef.current = setTimeout(() => {
                playSound('woof');
              }, 400);
            });
          }, 800);
        }
      });
    }, 700);
  }, [script, pageIndex, startTyping, playSound]);

  // ── Reset + restart when slide changes ───────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    clearTimers();
    setPhase('idle');
    setDisplayedText('');
    bubbleOpacity.value = 0;
    mascotX.value = SW;

    const t = setTimeout(() => runSequence(), 600);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
  }, [pageIndex, visible]);

  // ── Tap to skip typing ────────────────────────────────────────────────────

  const handleTap = useCallback(() => {
    if (phase === 'line1_typing') {
      clearInterval(typeTimerRef.current!);
      setDisplayedText(script.line1);
      setPhase('line1_done');
    } else if (phase === 'line2_typing') {
      clearInterval(typeTimerRef.current!);
      setDisplayedText(script.line2);
      setPhase('line2_done');
    }
  }, [phase, script]);

  // ── Animated styles ───────────────────────────────────────────────────────

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: mascotX.value }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
  }));

  const showBubble = phase !== 'idle' && phase !== 'entering' && phase !== 'woofing';

  if (!visible) return null;

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap} style={s.container}>
      <Animated.View style={[s.row, rowStyle]}>

        {/* Ollie + Roots Lottie animation */}
        <LottieView
          source={require('../../../assets/ollie and roots.json')}
          autoPlay
          loop
          style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}
        />

        {/* Dialogue bubble */}
        {showBubble && (
          <Animated.View style={[s.bubble, bubbleStyle]}>
            <View style={s.bubbleTail} />
            <Text style={s.bubbleText}>{displayedText}</Text>
          </Animated.View>
        )}

      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    height: LOTTIE_SIZE + 130,
  },
  row: {
    position: 'absolute',
    left: 16,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubble: {
    position: 'absolute',
    bottom: LOTTIE_SIZE + BUBBLE_GAP,
    left: 10,
    backgroundColor: 'white',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: SW * 0.62,
    shadowColor: '#3A2010',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(200,180,140,0.4)',
    zIndex: 10,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -10,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
