import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';
import type { TimeTheme } from '../../hooks/useTimeTheme';
import { hexToRgba } from '../../utils/color';

const { width: SW } = Dimensions.get('window');

export type TabName = 'Home' | 'Forest' | 'Plant' | 'Map' | 'Community';

interface TabItem {
  name: TabName;
  icon: string;
  activeIcon: string;
  label: string;
}

const TABS: TabItem[] = [
  { name: 'Home', icon: '🏡', activeIcon: '🏡', label: 'Home' },
  { name: 'Forest', icon: '🌲', activeIcon: '🌲', label: 'Forest' },
  { name: 'Plant', icon: '➕', activeIcon: '➕', label: 'Plant' },
  { name: 'Map', icon: '🗺️', activeIcon: '🗺️', label: 'Map' },
  { name: 'Community', icon: '👥', activeIcon: '👥', label: 'Community' },
];

interface BottomNavProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  /** Only passed while Home is the active tab — retints the nav to match Home's current
   * time-of-day period. Every other screen leaves this undefined and gets the static beige/green
   * look, unchanged. */
  theme?: TimeTheme | null;
}

function TabButton({
  tab,
  isActive,
  onPress,
  theme,
}: {
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
  theme?: TimeTheme | null;
}) {
  const { selection } = useHaptics();
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(isActive ? 1 : 0.85);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
    iconScale.value = withSpring(isActive ? 1 : 1.15, { damping: 10, stiffness: 250 }, () => {
      iconScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    selection();
    onPress();
  }, [isActive, onPress]);

  if (tab.name === 'Plant') {
    return (
      <TouchableOpacity
        style={styles.plantButtonWrapper}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Animated.View style={containerStyle}>
          <LinearGradient
            colors={[COLORS.sageLight, COLORS.forest]}
            style={styles.plantButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.Text style={[styles.plantIcon, iconStyle]}>🌱</Animated.Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabContent, containerStyle]}>
        {isActive && (
          <View style={[styles.activeIndicator, theme && { backgroundColor: theme.accentColor }]} />
        )}
        <Animated.View
          style={[
            styles.iconContainer,
            isActive && styles.activeIconContainer,
            isActive && theme && { backgroundColor: theme.accentColorSoft },
            iconStyle,
          ]}
        >
          <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
            {tab.icon}
          </Text>
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            theme && { color: theme.textSecondaryOnCard },
            isActive && styles.activeTabLabel,
            isActive && theme && { color: theme.accentColor },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function BottomNav({ activeTab, onTabPress, theme }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={60} tint={theme?.cardTint === 'dark' ? 'dark' : 'light'} style={styles.blurContainer}>
        <View style={[styles.overlay, theme && { backgroundColor: hexToRgba(theme.cardBackground, 0.85) }]} />
        <View style={styles.container}>
          {TABS.map(tab => (
            <TabButton
              key={tab.name}
              tab={tab}
              isActive={activeTab === tab.name}
              onPress={() => onTabPress(tab.name)}
              theme={theme}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  blurContainer: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...SHADOWS.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 245, 232, 0.85)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 56,
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    width: 20,
    height: 3,
    backgroundColor: COLORS.sage,
    borderRadius: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(135, 168, 120, 0.15)',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.55,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: COLORS.forest,
    fontWeight: '700',
  },
  plantButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20,
  },
  plantButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sage,
  },
  plantIcon: {
    fontSize: 26,
  },
});
