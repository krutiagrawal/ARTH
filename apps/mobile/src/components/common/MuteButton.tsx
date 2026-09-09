import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/colors';
import { useSoundSystem } from '../../hooks/useSoundSystem';

interface MuteButtonProps {
  style?: ViewStyle;
  /** Real frosted-glass look, for use over Home's illustrated sky. Everywhere else defaults to a
   * flat, brown-bordered circle instead. */
  glass?: boolean;
}

export function MuteButton({ style, glass = false }: MuteButtonProps) {
  const { isMuted, toggleMute } = useSoundSystem();
  const icon = <Text style={styles.icon}>{isMuted ? '🔇' : '🔊'}</Text>;

  return (
    <TouchableOpacity
      onPress={toggleMute}
      style={[styles.wrapper, style]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
    >
      {glass ? (
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          {icon}
        </BlurView>
      ) : (
        <View style={styles.border}>{icon}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  blur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  border: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: 22,
  },
  icon: {
    fontSize: 18,
  },
});
