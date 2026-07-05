import React, { memo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useParticles, useParticleAnimation, Particle } from '../../hooks/useParticles';

const { width: SW, height: SH } = Dimensions.get('window');

interface FloatingParticlesProps {
  count?: number;
  type?: Particle['type'];
  style?: any;
  /** When provided, particles are confined to a band of this height (starting at top:0 of the
   * container) instead of drifting across the full screen — used for a compact, always-visible
   * ambient strip rather than the default full-screen effect. */
  areaHeight?: number;
  /** Scales the fall duration (>1 = slower, <1 = faster). Defaults to 1 (unchanged elsewhere). */
  speedMultiplier?: number;
}

const ParticleItem = memo(({ particle, topOffset, travelDistance }: { particle: Particle; topOffset: number; travelDistance?: number }) => {
  const { translateY, translateX, opacity, rotate } = useParticleAnimation(
    particle.speed,
    particle.delay,
    travelDistance
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y + topOffset,
          width: particle.size,
          height: particle.size,
        },
        animatedStyle,
      ]}
    >
      {(particle.type === 'leaf' || particle.type === 'petal') && (
        <LeafShape size={particle.size} color={particle.color} />
      )}
      {(particle.type === 'dust' || particle.type === 'firefly') && (
        <View
          style={{
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: particle.color,
          }}
        />
      )}
    </Animated.View>
  );
});

export function LeafShape({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 20 26">
      <Path
        d="M10 1C10 1 18 8 18 15C18 20.5 14.5 25 10 25C5.5 25 2 20.5 2 15C2 8 10 1 10 1Z"
        fill={color}
      />
      <Path d="M10 4 L10 22" stroke="rgba(0,0,0,0.18)" strokeWidth={0.8} />
    </Svg>
  );
}

export const FloatingParticles = memo(function FloatingParticles({
  count = 10,
  type = 'leaf',
  style,
  areaHeight,
  speedMultiplier = 1,
}: FloatingParticlesProps) {
  const particles = useParticles(count, type, areaHeight ?? SH, speedMultiplier);
  const topOffset = areaHeight ? 0 : SH * 0.3;
  const travelDistance = areaHeight ? areaHeight * 1.4 : undefined;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, style]} pointerEvents="none">
      {particles.map(particle => (
        <ParticleItem key={particle.id} particle={particle} topOffset={topOffset} travelDistance={travelDistance} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
  },
});
