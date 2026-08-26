import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text } from '../common/AppText';
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
import { contrastRatio, hexToRgba, mixHex, relativeLuminance } from '../../utils/color';
import { getHeroSeamColor, getHeroSeamTextColors } from '../../utils/heroSeam';

const { width: SW } = Dimensions.get('window');

/** Rendered height of BottomNav's own content (container padding + tab icon/label stack),
 * excluding the bottom safe-area inset it also pads itself by. Keep in sync with `styles.container`
 * paddingVertical (8+8) + `styles.tabContent` paddingVertical (4+4) + icon height (36) + label
 * line height/margin (~16) below. Screens under the floating nav should size their scroll-content
 * bottom padding off `useBottomNavClearance()` instead of guessing their own magic number — three
 * screens previously each hardcoded a different guess and content ended up hidden behind the nav. */
export const BOTTOM_NAV_CONTENT_HEIGHT = 76;

/** Bottom padding a screen under the floating BottomNav should reserve so its last piece of
 * content clears the nav bar (plus a bit of breathing room). `extra` adds further gap on top of
 * that if a screen wants more spacing. */
export function useBottomNavClearance(extra = 16) {
  const insets = useSafeAreaInsets();
  // Mirror the bar's own `paddingBottom: Math.max(insets.bottom, 8)` below — reserving
  // only `insets.bottom` under-counts by 8px wherever the inset is 0 (Android 3-button
  // nav), which ate most of the intended gap and let the bar sit on the last card.
  return BOTTOM_NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 8) + extra;
}

export type TabName = string;

export interface TabItem {
  name: TabName;
  icon: string;
  label: string;
  /** Renders this tab as a raised, gradient-filled FAB (like the user app's center "Plant"
   * button) instead of a normal icon/label tab. At most one tab per set should set this. */
  raised?: boolean;
}

export const USER_TABS: TabItem[] = [
  { name: 'Home', icon: '🏡', label: 'Home' },
  { name: 'Forest', icon: '🌲', label: 'Forest' },
  { name: 'Plant', icon: '➕', label: 'Plant', raised: true },
  { name: 'Map', icon: '🗺️', label: 'Map' },
  { name: 'Community', icon: '👥', label: 'Community' },
];

/** An explicit background for callers whose screen isn't driven by the time-of-day theme — the
 * admin console, whose chrome is a fixed dark panel. Pass the same color the screen paints its
 * page with, so the floating bar reads as part of that page rather than a cream slab on top. */
export interface NavSurface {
  /** Opaque '#RRGGBB'. Washed over the blur at 85%, exactly like the themed path. */
  background: string;
  border?: string;
  tint?: 'light' | 'dark';
}

interface BottomNavProps {
  tabs: TabItem[];
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  /** Passed while a time-themed screen (user Home, NGO dashboard) is the active tab — retints the
   * nav to match that screen's current time-of-day period. Leave undefined for a static
   * beige/green bar. Ignored when `surface` is also given. */
  theme?: TimeTheme | null;
  /** Fixed background override, for screens outside the time-of-day system. */
  surface?: NavSurface | null;
}

/** Every color the bar needs, resolved from whichever source the caller supplied. */
interface NavPalette {
  background: string;
  border: string;
  tint: 'light' | 'dark';
  labelInactive: string;
  labelActive: string;
  indicator: string;
  iconPill: string;
  fabColors: [string, string];
}

function paletteFromTheme(theme: TimeTheme): NavPalette {
  // The bar floats over the *page*, not over a card — so it has to take the seam color the screen
  // actually paints itself with. `theme.cardBackground` (what this used to use) diverges from it
  // at afternoon, morning, dawn and night, which is what made the bar look like a foreign object
  // on exactly those periods.
  const background = getHeroSeamColor(theme);
  const text = getHeroSeamTextColors(theme);
  // Night's accent is a mid indigo on a deep indigo seam; below 3:1 it stops reading as a label
  // at all, so fall back to the seam's own primary text color.
  const accent = contrastRatio(theme.accentColor, background) >= 3 ? theme.accentColor : text.primary;

  return {
    background,
    border: theme.cardBorder,
    // Follow the seam's luminance, not `cardTint` — Night keeps light-tinted cards while its seam
    // is a deep indigo, and a light blur over that muddies into grey.
    tint: relativeLuminance(background) < 0.4 ? 'dark' : 'light',
    labelInactive: text.secondary,
    labelActive: accent,
    indicator: accent,
    iconPill: theme.accentColorSoft,
    // `accentColorSoft` is a ~15% alpha wash — useless as a gradient stop on a solid FAB, so
    // lighten the accent itself for the top stop to keep the button's sheen.
    fabColors: [mixHex(theme.accentColor, '#FFFFFF', 0.35), theme.accentColor],
  };
}

function paletteFromSurface(surface: NavSurface): NavPalette {
  const dark = surface.tint ? surface.tint === 'dark' : relativeLuminance(surface.background) < 0.4;
  const onSurface = dark ? '#FFFFFF' : COLORS.textPrimary;

  return {
    background: surface.background,
    border: surface.border ?? (dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.4)'),
    tint: dark ? 'dark' : 'light',
    labelInactive: hexToRgba(onSurface, 0.6),
    labelActive: dark ? COLORS.mint : COLORS.forest,
    indicator: dark ? COLORS.mint : COLORS.sage,
    iconPill: dark ? 'rgba(255,255,255,0.14)' : COLORS.glassSageSubtle,
    fabColors: [COLORS.sageLight, COLORS.forest],
  };
}

function TabButton({
  tab,
  isActive,
  onPress,
  palette,
}: {
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
  palette?: NavPalette | null;
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

  if (tab.raised) {
    return (
      <TouchableOpacity
        style={styles.plantButtonWrapper}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Animated.View style={containerStyle}>
          <LinearGradient
            colors={palette?.fabColors ?? [COLORS.sageLight, COLORS.forest]}
            style={styles.plantButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* A vector plus instead of the '➕' glyph — some Android/Expo Go emoji fonts have no
                color presentation for it and fall back to a black tofu box that reads as a cross. */}
            <Animated.View style={[styles.plusIconWrap, iconStyle]}>
              <View style={styles.plusBarH} />
              <View style={styles.plusBarV} />
            </Animated.View>
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
          <View style={[styles.activeIndicator, palette && { backgroundColor: palette.indicator }]} />
        )}
        <Animated.View
          style={[
            styles.iconContainer,
            isActive && styles.activeIconContainer,
            isActive && palette && { backgroundColor: palette.iconPill },
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
            palette && { color: palette.labelInactive },
            isActive && styles.activeTabLabel,
            isActive && palette && { color: palette.labelActive },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function BottomNav({ tabs, activeTab, onTabPress, theme, surface }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  // `surface` wins: a caller that names an explicit background knows something the time-of-day
  // theme doesn't (admin's fixed panel).
  const palette = surface
    ? paletteFromSurface(surface)
    : theme
      ? paletteFromTheme(theme)
      : null;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView
        intensity={60}
        tint={palette?.tint ?? 'light'}
        style={[styles.blurContainer, palette && { borderColor: palette.border }]}
      >
        <View
          style={[
            styles.overlay,
            palette && { backgroundColor: hexToRgba(palette.background, 0.85) },
          ]}
        />
        <View style={styles.container}>
          {tabs.map(tab => (
            <TabButton
              key={tab.name}
              tab={tab}
              isActive={activeTab === tab.name}
              onPress={() => onTabPress(tab.name)}
              palette={palette}
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
    backgroundColor: COLORS.glassSageSubtle,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.55,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
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
  plusIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBarH: {
    position: 'absolute',
    width: 20,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  plusBarV: {
    position: 'absolute',
    width: 3.5,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
