import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** Opens the likers list. Omitted when the count isn't tappable. */
  onPressCount?: () => void;
  size?: number;
  /** True while a toggle for this exact post is already in flight. Ignoring taps during that
   * window closes off a real race: two fast taps each read `liked` from their own render closure,
   * so the second can fire the same direction as the first instead of reversing it. */
  isToggling?: boolean;
}

/**
 * Heart with a spring "pop" on like.
 *
 * The animation runs unconditionally on press rather than off the `liked` prop: the mutation is
 * optimistic, so waiting for the prop to flip would either double-fire (once optimistically, once
 * on the server response) or stutter on a rollback.
 */
export function LikeButton({ liked, count, onToggle, onPressCount, size = 22, isToggling = false }: LikeButtonProps) {
  const { light } = useHaptics();
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    transform: [{ scale: 1 + burst.value * 0.9 }],
  }));

  const handlePress = useCallback(() => {
    if (isToggling) return;
    light();
    scale.value = withSequence(
      withTiming(0.8, { duration: 90 }),
      withSpring(1.25, { damping: 6, stiffness: 320 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    // Only the like direction gets the ring flourish; un-liking should feel quiet.
    if (!liked) {
      burst.value = withSequence(withTiming(0.55, { duration: 120 }), withTiming(0, { duration: 260 }));
    }
    onToggle();
  }, [liked, light, onToggle, burst, scale, isToggling]);

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7} hitSlop={8}>
      <Animated.View style={styles.heartWrap}>
        <Animated.View style={[styles.burst, { width: size * 1.7, height: size * 1.7, borderRadius: size }, burstStyle]} />
        <Animated.Text style={[{ fontSize: size }, heartStyle]}>{liked ? '❤️' : '🤍'}</Animated.Text>
      </Animated.View>

      {count > 0 && (
        <Text
          style={[styles.count, liked && styles.countLiked]}
          onPress={onPressCount}
          suppressHighlighting
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heartWrap: { alignItems: 'center', justifyContent: 'center' },
  burst: {
    position: 'absolute',
    backgroundColor: 'rgba(224,90,90,0.28)',
  },
  count: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  countLiked: { color: COLORS.danger },
});
