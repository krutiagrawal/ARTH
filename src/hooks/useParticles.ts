import { useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  delay: number;
  type: 'leaf' | 'petal' | 'dust' | 'firefly' | 'snow';
  rotation: number;
  color: string;
}

export function useParticles(
  count = 12,
  type: Particle['type'] = 'leaf',
  areaHeight: number = SCREEN_HEIGHT,
  speedMultiplier = 1
) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: `p-${i}`,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * areaHeight,
      size: type === 'dust' ? Math.random() * 4 + 2 : Math.random() * 14 + 8,
      opacity: Math.random() * 0.5 + 0.2,
      speed: (Math.random() * 3000 + 2000) * speedMultiplier,
      delay: Math.random() * 4000,
      type,
      rotation: Math.random() * 360,
      color: getParticleColor(type),
    }))
  );

  return particles;
}

// Leaves: mostly fresh greens, with some dried-out autumn browns/oranges mixed in.
export const LEAF_COLORS = ['#87A878', '#5E8550', '#A8C499', '#2D5A27', '#C1440E', '#A0724A', '#8B6B47'];

function getParticleColor(type: Particle['type']): string {
  switch (type) {
    case 'leaf':
    case 'petal':
      return LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    case 'dust':
      return ['rgba(212,168,83,0.6)', 'rgba(255,255,255,0.4)', 'rgba(200,230,192,0.5)'][Math.floor(Math.random() * 3)];
    case 'firefly':
      return ['#D4A853', '#E8B84B', '#FFD700'][Math.floor(Math.random() * 3)];
    case 'snow':
      return 'rgba(255,255,255,0.8)';
    default:
      return '#87A878';
  }
}

export function useParticleAnimation(speed: number, delay: number, travelDistance: number = SCREEN_HEIGHT * 1.2) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const startAnimations = () => {
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(-travelDistance, {
            duration: speed,
            easing: Easing.linear,
          }),
          -1,
          false
        )
      );

      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(40, { duration: speed * 0.25, easing: Easing.inOut(Easing.sin) }),
            withTiming(-20, { duration: speed * 0.25, easing: Easing.inOut(Easing.sin) }),
            withTiming(30, { duration: speed * 0.25, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: speed * 0.25, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      );

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: speed * 0.1 }),
            withTiming(0.7, { duration: speed * 0.8 }),
            withTiming(0, { duration: speed * 0.1 })
          ),
          -1,
          false
        )
      );

      rotate.value = withDelay(
        delay,
        withRepeat(
          withTiming(360, { duration: speed, easing: Easing.linear }),
          -1,
          false
        )
      );
    };

    startAnimations();
  }, []);

  return { translateY, translateX, opacity, rotate };
}
