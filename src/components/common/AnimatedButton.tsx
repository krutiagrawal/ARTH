import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';

interface AnimatedButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'golden';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  gradientColors?: string[];
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AnimatedButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  gradientColors,
}: AnimatedButtonProps) {
  const { medium, light } = useHaptics();
  const scale = useSharedValue(1);
  const brightness = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: brightness.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
    brightness.value = withTiming(0.88, { duration: 80 });
    light();
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    brightness.value = withTiming(1, { duration: 150 });
  }, []);

  const handlePress = useCallback(() => {
    medium();
    onPress();
  }, [onPress]);

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.md },
    md: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: RADIUS.lg },
    lg: { paddingVertical: 20, paddingHorizontal: 40, borderRadius: RADIUS.xl },
  };

  const textSizes = {
    sm: { fontSize: 14, fontWeight: '600' as const },
    md: { fontSize: 16, fontWeight: '700' as const },
    lg: { fontSize: 18, fontWeight: '700' as const },
  };

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        style={[animatedStyle, fullWidth && styles.fullWidth, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={(gradientColors ?? [COLORS.sageLight, COLORS.forest]) as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyles[size], disabled && styles.disabled]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.textPrimary, textSizes[size], textStyle]}>{label}</Text>
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'golden') {
    return (
      <AnimatedTouchable
        style={[animatedStyle, fullWidth && styles.fullWidth, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[COLORS.amberLight, COLORS.golden, COLORS.earth]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyles[size], disabled && styles.disabled]}
        >
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.textPrimary, textSizes[size], textStyle]}>{label}</Text>
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedTouchable
        style={[
          animatedStyle,
          styles.secondary,
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.textSecondary, textSizes[size], textStyle]}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  if (variant === 'ghost') {
    return (
      <AnimatedTouchable
        style={[animatedStyle, styles.ghost, sizeStyles[size], fullWidth && styles.fullWidth, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.textGhost, textSizes[size], textStyle]}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sage,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.mintLight,
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    ...SHADOWS.sm,
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPrimary: {
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  textSecondary: {
    color: COLORS.forest,
    letterSpacing: 0.3,
  },
  textGhost: {
    color: COLORS.sage,
    letterSpacing: 0.3,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});
