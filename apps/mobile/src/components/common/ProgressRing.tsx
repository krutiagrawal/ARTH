import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  delay?: number;
  showPercentage?: boolean;
}

export function ProgressRing({
  size = 80,
  strokeWidth = 7,
  progress,
  color = COLORS.sage,
  trackColor = 'rgba(135,168,120,0.15)',
  label,
  sublabel,
  delay = 0,
  showPercentage = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withDelay(
      delay,
      withTiming(Math.min(progress, 1), {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View style={styles.labelContainer}>
        {label && (
          <Text style={[styles.label, { color }]} numberOfLines={1}>
            {label}
          </Text>
        )}
        {showPercentage && (
          <Text style={[styles.percentage, { color }]}>
            {Math.round(progress * 100)}%
          </Text>
        )}
        {sublabel && (
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  sublabel: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginTop: 1,
  },
});
