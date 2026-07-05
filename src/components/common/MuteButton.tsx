import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSoundSystem } from '../../hooks/useSoundSystem';

interface MuteButtonProps {
  style?: ViewStyle;
}

export function MuteButton({ style }: MuteButtonProps) {
  const { isMuted, toggleMute } = useSoundSystem();

  return (
    <TouchableOpacity onPress={toggleMute} style={[styles.wrapper, style]} activeOpacity={0.75}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <Text style={styles.icon}>{isMuted ? '🔇' : '🔊'}</Text>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  icon: {
    fontSize: 18,
  },
});
