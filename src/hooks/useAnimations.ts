import { useEffect, useRef, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ANIMATION } from '../constants/theme';

export function useFadeIn(delay = 0, duration = ANIMATION.normal) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return style;
}

export function useSlideUp(delay = 0, distance = 30, duration = ANIMATION.normal) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withSpring(0, ANIMATION.spring));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return style;
}

export function useBreathing(min = 0.95, max = 1.05, duration = 3000) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(max, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(min, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return style;
}

export function useFloat(amplitude = 8, duration = 2500) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(amplitude, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  return style;
}

export function usePulse(minScale = 0.97, maxScale = 1.03, duration = 1500) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return style;
}

export function useShimmer(duration = 2000) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  return progress;
}

export function useCountUp(target: number, duration = 1500, delay = 0) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withDelay(delay, withTiming(target, { duration, easing: Easing.out(Easing.cubic) }));
  }, [target]);

  return value;
}

export function useSpringPress() {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 12, stiffness: 300 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, ANIMATION.springBouncy);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { style, onPressIn, onPressOut };
}

export function useRotate(duration = 8000, clockwise = true) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(clockwise ? 360 : -360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return style;
}

export function useWave(amplitude = 15, duration = 3000, delay = 0) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return style;
}

export function useScaleIn(delay = 0) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, ANIMATION.springBouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return style;
}
