import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { Mascot, MascotBubble } from '../components/common/Mascot';
import { FloatingParticles, LeafShape } from '../components/common/FloatingParticles';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { EcoWidget, StreakWidget } from '../components/common/EcoWidget';
import { ProgressRing } from '../components/common/ProgressRing';
import { AnimatedButton } from '../components/common/AnimatedButton';
import {
  useFadeIn,
  useSlideUp,
} from '../hooks/useAnimations';
import { useTimeTheme, type TimeTheme } from '../hooks/useTimeTheme';
import { MuteButton } from '../components/common/MuteButton';
import { useAuth } from '../context/AuthContext';
import { useTrees, useTodayMissions, useEcoFacts, useCompleteMission } from '../hooks/useApiQueries';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import type { ApiUser } from '../api/auth';
import type { ApiTree } from '../api/trees';
import type { ApiDailyMission } from '../api/missions';
import type { ApiWeather } from '../api/weather';
import { getForestLevelLabel, getXpProgress } from '../constants/forestLevels';
import { LEAF_COLORS } from '../hooks/useParticles';
import { hexToRgba } from '../utils/color';

const { width: SW, height: SH } = Dimensions.get('window');
const RAIN_FALL_GROUND_Y = SH - 200;
/** How tall the illustrated hero section is — sky/hills/lake (or the real illustration image)
 * plus the header text and stat row that sit on top of it. A normal-flow block, not a fixed
 * backdrop, so it scrolls away with the rest of the page.
 *
 * NOTE: with `resizeMode="cover"`, the container's aspect ratio is always well under the
 * illustrations' 1.5:1 landscape aspect, so the image's full vertical range (sky through
 * hills/lake) is never cropped out regardless of this value — only the sides get cropped. This
 * was briefly dropped to 0.45 to try to close up perceived "too much space" below the hero, but
 * that space was actually between the *cards themselves* (mascot/XP/missions/etc.), not inside
 * the hero — so 0.54 is restored here and `scrollContent`'s gap is what got tightened instead. */
const HERO_HEIGHT = SH * 0.54;

function weatherEmoji(condition: string): string {
  switch (condition) {
    case 'Clear': return '☀️';
    case 'Clouds': return '☁️';
    case 'Rain': return '🌧️';
    case 'Drizzle': return '🌦️';
    case 'Thunderstorm': return '⛈️';
    case 'Snow': return '❄️';
    case 'Mist':
    case 'Fog':
    case 'Haze': return '🌫️';
    default: return '🌤️';
  }
}

/** The page background directly beneath the hero illustration. Normally just `theme.cardBackground`
 * (matches the other cards), but Afternoon's real illustration ends on green grass, not white —
 * a plain white seam there reads as a blank gap, so it gets its own light mint tone instead. Only
 * scoped to Afternoon for now since it's the only period whose real photo art needs this; revisit
 * once more periods have real illustrations. */
function getHeroSeamColor(theme: TimeTheme): string {
  if (theme.period === 'afternoon') return '#E3F4E8';
  // Night's cardTint went light (periwinkle cards, dark text) to match its reference mockup, but
  // the night.png illustration's ground/lake stays a deep indigo — the page background behind the
  // hero must follow the illustration, not the (now much lighter) card color, or the seam breaks.
  if (theme.period === 'night') return '#2A306B';
  // Same class of mismatch as Afternoon/Night: dawn.png's ground is a saturated purple-mauve, not
  // the near-white cardBackground — reuse the theme's own mid-hill tone instead of a new hex.
  if (theme.period === 'dawn') return '#D9B8E8';
  // morning.png's ground is bright green meadow vs. a pure-white cardBackground — Morning already
  // has a ready pale-green token for this (cardBackgroundAlt), so reuse it instead of a new hex.
  if (theme.period === 'morning') return theme.cardBackgroundAlt;
  return theme.cardBackground;
}

type SceneryMode = 'leaves' | 'rain' | 'wind';

function getSceneryMode(weather: ApiWeather | null): SceneryMode {
  if (!weather) return 'leaves';
  if (weather.scene === 'rainy') return 'rain';
  if (weather.temperatureCelsius < 20) return 'wind';
  return 'leaves';
}

function RainDrop({ x, delay, duration, groundY }: { x: number; delay: number; duration: number; groundY: number }) {
  const translateY = useSharedValue(-40);
  const opacity = useSharedValue(0);
  const splashScale = useSharedValue(0);
  const splashOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(groundY, { duration, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 120 }),
          withTiming(0.45, { duration: Math.max(duration - 240, 100) }),
          withTiming(0, { duration: 120 })
        ),
        -1,
        false
      )
    );

    // Splash ring pops right as the drop reaches the ground, then resets for the next cycle —
    // the sequence's total duration matches the drop's fall duration, so they stay in sync.
    const preSplash = Math.max(duration - 160, 0);
    splashScale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: preSplash }),
          withTiming(1.4, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 30 })
        ),
        -1,
        false
      )
    );
    splashOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: preSplash }),
          withTiming(0.55, { duration: 60 }),
          withTiming(0, { duration: 100 })
        ),
        -1,
        false
      )
    );
  }, []);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: '12deg' }],
    opacity: opacity.value,
  }));
  const splashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: splashScale.value }],
    opacity: splashOpacity.value,
  }));

  return (
    <>
      <Animated.View style={[styles.raindrop, { left: x }, dropStyle]} />
      <Animated.View style={[styles.splash, { left: x - 7, top: groundY + 10 }, splashStyle]} />
    </>
  );
}

function RainEffect({ count = 22 }: { count?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * SW,
        delay: Math.random() * 1500,
        duration: 650 + Math.random() * 450,
      })),
    [count]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((d, i) => (
        <RainDrop key={i} {...d} groundY={RAIN_FALL_GROUND_Y} />
      ))}
    </View>
  );
}

function WindLeaf({ y, delay, duration, color }: { y: number; delay: number; duration: number; color: string }) {
  const translateX = useSharedValue(-40);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(SW + 40, { duration, easing: Easing.linear }), -1, false)
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(14, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(-10, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.25, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: duration * 0.4, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(delay, withTiming(0.85, { duration: 300 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.windLeaf, { top: y }, style]}>
      <LeafShape size={14} color={color} />
    </Animated.View>
  );
}

function GustLine({ y, delay, duration }: { y: number; delay: number; duration: number }) {
  const translateX = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(SW + 100, { duration, easing: Easing.linear }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: duration * 0.3 }),
          withTiming(0.3, { duration: duration * 0.4 }),
          withTiming(0, { duration: duration * 0.3 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.gustLine, { top: y }, style]} />;
}

function WindEffect({ count = 6 }: { count?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        y: Math.random() * SW * 0.9 + 40,
        delay: Math.random() * 2000,
        duration: 2200 + Math.random() * 1200,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      })),
    [count]
  );
  const gusts = useMemo(
    () =>
      [0, 1, 2].map(() => ({
        y: Math.random() * SW * 0.9 + 60,
        delay: Math.random() * 1800,
        duration: 1600 + Math.random() * 800,
      })),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {gusts.map((g, i) => (
        <GustLine key={`g-${i}`} {...g} />
      ))}
      {leaves.map((l, i) => (
        <WindLeaf key={i} {...l} />
      ))}
    </View>
  );
}



function HomeBird({
  direction,
  y,
  delay,
  duration,
}: {
  direction: 'left' | 'right';
  y: number;
  delay: number;
  duration: number;
}) {
  const startX = direction === 'right' ? -40 : SW + 40;
  const endX = direction === 'right' ? SW + 40 : -40;
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(endX, { duration, easing: Easing.linear }), -1, false)
    );
    // Gentle up/down bobbing so the flight path bounces rather than running in a straight line —
    // the steps sum to `duration`, keeping it in sync with the horizontal sweep's own loop period.
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: duration * 0.15, easing: Easing.inOut(Easing.sin) }),
          withTiming(-10, { duration: duration * 0.2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scaleX: direction === 'right' ? -1 : 1 },
    ],
  }));

  return (
    <Animated.View style={[styles.homeBird, { top: y }, style]}>
      <Text style={styles.homeBirdEmoji}>🐦</Text>
    </Animated.View>
  );
}

/** Birds sweeping across the full screen width, independent of scroll position and of which
 * period/background is active — restores the original always-visible flying-bird ambience. */
function HomeBirds() {
  const birds = useMemo(
    () => [
      { direction: 'right' as const, y: 70, delay: 0, duration: 14000 },
      { direction: 'left' as const, y: 130, delay: 3000, duration: 16000 },
      { direction: 'right' as const, y: 195, delay: 7000, duration: 13000 },
      { direction: 'left' as const, y: 45, delay: 10000, duration: 17000 },
    ],
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {birds.map((b, i) => (
        <HomeBird key={i} {...b} />
      ))}
    </View>
  );
}

const FIREFLY_COLORS = ['#D4A853', '#E8B84B', '#FFD700'];

/** A single firefly: wanders in a small loop around its anchor point (unlike HomeBird's
 * straight-line sweep) and blinks on/off on its own randomized cycle so 8-10 of them never
 * flicker in unison. */
function HomeFirefly({
  x,
  y,
  delay,
  color,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(18, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-8, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    // Blink cycle — randomized duration per instance (baked into `delay`'s caller via unique
    // per-firefly timings) so the swarm blinks asynchronously rather than in lockstep.
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 + Math.random() * 400 }),
          withTiming(1, { duration: 500 + Math.random() * 700 }),
          withTiming(0.1, { duration: 350 + Math.random() * 350 }),
          withTiming(0.1, { duration: 300 + Math.random() * 500 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.firefly, { left: x, top: y, backgroundColor: color, shadowColor: color }, style]}
    />
  );
}

/** Replaces HomeBirds at Night/Late Night — a swarm of blinking, wandering fireflies scattered
 * across the full screen instead of birds sweeping across it. */
function HomeFireflies() {
  const fireflies = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        x: Math.random() * SW,
        y: 40 + Math.random() * (SH * 0.55),
        delay: Math.random() * 2000,
        color: FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)],
      })),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {fireflies.map((f, i) => (
        <HomeFirefly key={i} {...f} />
      ))}
    </View>
  );
}

/** The entire illustrated top section — header text, stat row, hero illustration (a real image
 * when the current period has one, else the Skia-drawn ForestHeroCanvas fallback), and the
 * Trees/CO2/Forest stats pill — as ONE normal-flow block. It's the first child of the page's
 * ScrollView, so it scrolls away with everything else instead of staying fixed while the rest of
 * the page scrolls on top of it. */
function HeroSection({
  theme,
  user,
  navigation,
  onNavigateTab,
  weather,
}: {
  theme: TimeTheme;
  user: ApiUser | null;
  navigation: any;
  onNavigateTab: (tab: string) => void;
  weather: ApiWeather | null;
}) {
  const insets = useSafeAreaInsets();
  const isLightText = theme.textOnSky === '#FFFFFF';

  return (
    <View style={[styles.heroSection, { height: HERO_HEIGHT }]}>
      {theme.heroImage ? (
        <Image
          source={theme.heroImage}
          style={{ position: 'absolute', top: 0, left: 0, width: SW, height: HERO_HEIGHT }}
          resizeMode="cover"
          onError={(e) => console.warn('[HeroSection] hero image failed to load:', e.nativeEvent.error)}
          onLoad={() => console.log('[HeroSection] hero image loaded ok for period:', theme.period)}
        />
      ) : (
        <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={14} />
      )}

      {/* Softens the seam into the flat page background below regardless of the illustration's
          own exact bottom-edge color — matters most for real images, whose ground tone won't
          pixel-match theme.cardBackground the way the Skia fallback's colors do. Proportional to
          HERO_HEIGHT (not a fixed px) so it's tall enough to fully resolve to the target color
          before the section ends, even when the illustration's ground is strongly saturated
          (e.g. Blue Hour's purple-blue) — too short a fade leaves a hard visible edge right at
          the hero/page boundary instead of a gradual blend. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', getHeroSeamColor(theme)]}
        style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.24 }]}
        pointerEvents="none"
      />

      {/* Header text, normal flow at the top of this block. Color follows theme.textOnSky so it
          stays legible on both dark skies (white) and pale skies like Morning/Afternoon (dark
          green) — the shadow flips to a soft light glow for dark text instead of a dark shadow,
          which would be invisible/wrong the other way round. */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textOnSky }, !isLightText && styles.textGlow]}>
            {theme.greeting} {theme.emoji}
          </Text>
          <Text style={[styles.userName, { color: theme.textOnSky }, !isLightText && styles.textGlow]}>
            {user?.name ?? 'Your'}'s Forest
          </Text>
          {weather && (
            <Text style={[styles.weatherLine, { color: theme.textOnSky }, !isLightText && styles.textGlow]}>
              📍 {weather.city} · {weather.temperatureCelsius}°C {weatherEmoji(weather.condition)}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <MuteButton style={styles.muteInHeader} />
          <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('Profile')}>
            <LinearGradient
              colors={[COLORS.sageLight, COLORS.forest]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{user?.avatarEmoji ?? '🧑‍🌾'}</Text>
            </LinearGradient>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>Lv.{user?.level ?? 1}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top stats row */}
      <View style={styles.statsRow}>
        <StreakWidget streak={user?.streakCurrent ?? 0} isActive={(user?.streakCurrent ?? 0) > 0} />
        <View style={styles.statsRight}>
          <EcoWidget
            icon="🌿"
            value={user?.treesPlantedCount ?? 0}
            label="Trees"
            variant="glass"
            dark
            color={theme.accentColor}
            cardBackground={theme.cardBackground}
            textColor={theme.textSecondaryOnCard}
            subTextColor={theme.textSecondaryOnCard}
            borderColor={theme.cardBorder}
            delay={100}
            onPress={() => onNavigateTab('Map')}
          />
          <EcoWidget
            icon="💨"
            value={`${(user?.totalCo2Absorbed ?? 0).toFixed(1)}kg`}
            label="CO₂"
            variant="glass"
            dark
            color={theme.accentColor}
            cardBackground={theme.cardBackground}
            textColor={theme.textSecondaryOnCard}
            subTextColor={theme.textSecondaryOnCard}
            borderColor={theme.cardBorder}
            delay={200}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      {/* Forest stats pill — anchored near the bottom edge of this section, at the hills/ground
          seam, but part of this block's normal flow so it scrolls with everything else. Real
          glassmorphism: BlurView + a theme-tinted (not hardcoded white) translucent overlay, so
          the illustration behind it hints through and the color matches the current period. */}
      <BlurView
        intensity={35}
        tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={styles.forestStats}
        pointerEvents="none"
      >
        <View style={[styles.forestStatsOverlay, { backgroundColor: hexToRgba(theme.cardBackground, 0.4) }]} />
        <View style={styles.forestStatRow}>
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: theme.textPrimaryOnCard }]}>{user?.treesPlantedCount ?? 0}</Text>
            <Text style={[styles.forestStatLabel, { color: theme.textSecondaryOnCard }]}>Trees</Text>
          </View>
          <View style={[styles.forestStatDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: theme.textPrimaryOnCard }]}>{(user?.totalCo2Absorbed ?? 0).toFixed(1)}</Text>
            <Text style={[styles.forestStatLabel, { color: theme.textSecondaryOnCard }]}>kg CO₂</Text>
          </View>
          <View style={[styles.forestStatDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: theme.textPrimaryOnCard }]}>Lv.{user?.level ?? 1}</Text>
            <Text style={[styles.forestStatLabel, { color: theme.textSecondaryOnCard }]}>Forest</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

function MissionCard({ missions, navigation }: { missions: ApiDailyMission[]; navigation: any }) {
  const slideStyle = useSlideUp(100, 24);
  const theme = useTimeTheme();
  const completedCount = missions.filter(m => m.completed).length;
  const progress = missions.length > 0 ? completedCount / missions.length : 0;
  const completeMissionMutation = useCompleteMission();

  const handleMissionPress = (mission: ApiDailyMission) => {
    if (mission.completed) return;
    if (mission.type === 'plant') {
      navigation.navigate('PlantTree');
      return;
    }
    completeMissionMutation.mutate(mission.id);
  };

  const rowBg = theme.cardTint === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';

  return (
    <Animated.View style={slideStyle}>
      <BlurView
        intensity={35}
        tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.missionCard, { borderColor: theme.cardBorder, borderWidth: 1 }]}
      >
        <LinearGradient
          colors={[hexToRgba(theme.cardBackground, 0.4), hexToRgba(theme.cardBackgroundAlt, 0.4)]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.missionHeader}>
          <View>
            <Text style={[styles.missionTag, { color: theme.accentColor }]}>DAILY MISSIONS</Text>
            <Text style={[styles.missionTitle, { color: theme.textPrimaryOnCard }]}>Today's Quests</Text>
          </View>
          <ProgressRing
            size={52}
            strokeWidth={5}
            progress={progress}
            color={theme.accentColor}
            trackColor={theme.accentColorSoft}
            label={`${completedCount}/${missions.length}`}
            delay={400}
          />
        </View>

        <View style={styles.missionList}>
          {missions.map((mission, i) => (
            <TouchableOpacity
              key={mission.id}
              activeOpacity={0.7}
              disabled={mission.completed}
              onPress={() => handleMissionPress(mission)}
            >
              <View style={[styles.missionItem, { backgroundColor: rowBg }, mission.completed && styles.missionItemDone]}>
                <View style={[styles.missionCheck, { borderColor: theme.accentColor }, mission.completed && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}>
                  <Text style={styles.missionCheckIcon}>{mission.completed ? '✓' : ''}</Text>
                </View>
                <Text style={styles.missionIcon}>{mission.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionItemTitle, { color: theme.textPrimaryOnCard }, mission.completed && styles.missionItemDoneText]}>
                    {mission.title}
                  </Text>
                  <Text style={[styles.missionItemDesc, { color: theme.textSecondaryOnCard }]}>{mission.description}</Text>
                </View>
                <View style={styles.missionXp}>
                  <Text style={styles.missionXpText}>+{mission.xpReward} XP</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </Animated.View>
  );
}

function RecentTrees({ trees, onNavigateTab }: { trees: ApiTree[]; onNavigateTab: (tab: string) => void }) {
  const slideStyle = useSlideUp(200, 24);
  const theme = useTimeTheme();
  const recentTrees = trees.slice(0, 4);

  return (
    <Animated.View style={slideStyle}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textOnSky }]}>Recent Plants</Text>
        <TouchableOpacity onPress={() => onNavigateTab('Map')}>
          <Text style={[styles.seeAll, { color: theme.accentColor }]}>See all →</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.treeScroll}>
        {recentTrees.map((tree, i) => (
          <TouchableOpacity key={tree.id} activeOpacity={0.85} onPress={() => onNavigateTab('Map')}>
            <BlurView
              intensity={35}
              tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView"
              style={[styles.treeCard, { borderColor: theme.cardBorder, borderWidth: 1 }]}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(theme.cardBackground, 0.4) }]} />
              <Text style={styles.treeCardEmoji}>
                {['🌱', '🌿', '🌳', '🌲', '🎋'][tree.growthStage - 1]}
              </Text>
              <Text style={[styles.treeCardName, { color: theme.textPrimaryOnCard }]}>{tree.nickname}</Text>
              <Text style={[styles.treeCardSpecies, { color: theme.textSecondaryOnCard }]}>{tree.species}</Text>
              <View style={[styles.treeGrowthBar, { backgroundColor: theme.accentColorSoft }]}>
                <View
                  style={[
                    styles.treeGrowthFill,
                    { width: `${(tree.growthStage / 5) * 100}%`, backgroundColor: theme.accentColor },
                  ]}
                />
              </View>
              <Text style={[styles.treeCardLocation, { color: theme.textSecondaryOnCard }]}>
                📍 {tree.location?.split(',')[0] ?? 'Unknown'}
              </Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function EcoFactCard({ fact }: { fact: string }) {
  const slideStyle = useSlideUp(300, 24);
  const theme = useTimeTheme();
  return (
    <Animated.View style={slideStyle}>
      <BlurView
        intensity={35}
        tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={[styles.ecoFactCard, { borderColor: theme.cardBorder, borderWidth: 1 }]}
      >
        <LinearGradient
          colors={[hexToRgba(theme.cardBackground, 0.4), hexToRgba(theme.cardBackgroundAlt, 0.4)]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={[styles.ecoFactTag, { color: theme.accentColor }]}>🌍 ECO INSIGHT</Text>
        <Text style={[styles.ecoFactText, { color: theme.textPrimaryOnCard }]}>{fact}</Text>
      </BlurView>
    </Animated.View>
  );
}

export function HomeScreen({ navigation, onNavigateTab }: any) {
  const theme = useTimeTheme();
  const { user } = useAuth();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);

  const { data: trees = [] } = useTrees(4);
  const { data: missions = [] } = useTodayMissions();
  const { data: ecoFacts = [] } = useEcoFacts();

  const todayFact = ecoFacts.length > 0 ? ecoFacts[new Date().getDate() % ecoFacts.length] : '';
  const forestLevelLabel = getForestLevelLabel(user?.level ?? 1);
  const xpProgress = getXpProgress(user?.xp ?? 0, user?.level ?? 1);

  return (
    <View style={[styles.container, { backgroundColor: getHeroSeamColor(theme) }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        {/* Illustrated hero — header, stat row, scenery, and stats pill all scroll together as
            one normal-flow block instead of a fixed backdrop the rest of the page scrolls over. */}
        <HeroSection theme={theme} user={user} navigation={navigation} onNavigateTab={onNavigateTab} weather={weather} />

        {/* Mascot greeting */}
        <View style={styles.mascotSection}>
          <MascotBubble
            message={`You're on a ${user?.streakCurrent ?? 0}-day streak! Keep it going 🌱`}
            size={104}
            mood="encouraging"
          />
        </View>

        {/* XP Progress */}
        <View style={styles.xpRow}>
          <BlurView
            intensity={35}
            tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={[styles.xpCard, { borderColor: theme.cardBorder, borderWidth: 1 }]}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(theme.cardBackground, 0.4) }]} />
            <View style={styles.xpContent}>
              <View>
                <Text style={[styles.xpLevel, { color: theme.accentColor }]}>{forestLevelLabel}</Text>
                <Text style={[styles.xpSubLabel, { color: theme.textSecondaryOnCard }]}>Forest Level</Text>
              </View>
              <ProgressRing
                size={58}
                strokeWidth={6}
                progress={xpProgress.progress}
                color={theme.accentColor}
                trackColor={theme.accentColorSoft}
                label={`${Math.round(xpProgress.progress * 100)}%`}
                delay={300}
              />
            </View>
            <View style={styles.xpBarContainer}>
              <View style={[styles.xpBar, { backgroundColor: theme.accentColorSoft }]}>
                <Animated.View style={[styles.xpBarFill, { width: `${xpProgress.progress * 100}%`, backgroundColor: theme.accentColor }]} />
              </View>
              <Text style={[styles.xpBarLabel, { color: theme.textSecondaryOnCard }]}>
                {xpProgress.current} / {xpProgress.needed} XP to next level
              </Text>
            </View>
          </BlurView>
        </View>

        <MissionCard missions={missions} navigation={navigation} />
        <RecentTrees trees={trees} onNavigateTab={onNavigateTab} />
        {todayFact ? <EcoFactCard fact={todayFact} /> : null}
      </ScrollView>

      {/* Ambient scenery — rendered last so it drifts on top of everything, a constant animation.
          Reacts to real detected weather: rain when rainy, a windy breeze when cold, leaves otherwise. */}
      <View style={styles.ambientLayer} pointerEvents="none">
        {theme.period === 'night' || theme.period === 'lateNight' ? <HomeFireflies /> : <HomeBirds />}
        {sceneryMode === 'rain' && <RainEffect count={24} />}
        {sceneryMode === 'wind' && <WindEffect count={6} />}
        {sceneryMode === 'leaves' && (
          <FloatingParticles
            count={5}
            type={theme.particleType === 'firefly' ? 'leaf' : theme.particleType}
            speedMultiplier={2.2}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  homeBird: {
    position: 'absolute',
  },
  homeBirdEmoji: {
    fontSize: 16,
  },
  firefly: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  raindrop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: 'rgba(150,190,230,0.55)',
  },
  splash: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(180,210,240,0.7)',
  },
  windLeaf: {
    position: 'absolute',
  },
  gustLine: {
    position: 'absolute',
    width: 70,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  weatherLine: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  /** Overrides the dark drop-shadow above with a soft light glow instead — used when
   * `theme.textOnSky` is a dark color (Morning/Afternoon), since a dark shadow behind dark text
   * would be invisible at best and muddy at worst. */
  textGlow: {
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muteInHeader: {
    // positioned inline in the header row
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sage,
  },
  avatarText: {
    fontSize: 22,
  },
  xpBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    backgroundColor: COLORS.golden,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  xpBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: -16,
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  statsRight: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  forestStats: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    ...SHADOWS.md,
  },
  /** A blur alone reads as barely-there against a busy, similarly-toned illustration (e.g. pink
   * hills at Sunset) — this flat semi-opaque layer underneath gives the pill a visible surface
   * regardless of what's behind it. */
  forestStatsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  forestStatRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  forestStat: {
    flex: 1,
    alignItems: 'center',
  },
  forestStatNum: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.forestDeep,
  },
  forestStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forestStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 4,
  },
  mascotSection: {
    paddingLeft: 8,
  },
  xpRow: {},
  xpCard: {
    gap: 10,
    borderRadius: RADIUS.lg,
    padding: 16,
    overflow: 'hidden',
  },
  xpContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLevel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.amberLight,
  },
  xpSubLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBarContainer: {
    gap: 4,
  },
  xpBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.golden,
    borderRadius: 3,
  },
  xpBarLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.sageLight,
    fontWeight: '600',
  },
  treeScroll: {
    marginTop: 8,
  },
  treeCard: {
    width: 130,
    marginRight: 10,
    alignItems: 'center',
    padding: 14,
    gap: 4,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  treeCardEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  treeCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  treeCardSpecies: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  treeGrowthBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  treeGrowthFill: {
    height: '100%',
    backgroundColor: COLORS.sageLight,
    borderRadius: 2,
  },
  treeCardLocation: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  missionCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  missionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sageLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  missionList: {
    gap: 8,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    padding: 12,
  },
  missionItemDone: {
    opacity: 0.6,
  },
  missionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.sageLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionCheckDone: {
    backgroundColor: COLORS.sageLight,
    borderColor: COLORS.sageLight,
  },
  missionCheckIcon: {
    fontSize: 12,
    color: COLORS.forestDeep,
    fontWeight: '700',
  },
  missionIcon: {
    fontSize: 20,
  },
  missionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  missionItemDoneText: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  missionItemDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  missionXp: {
    backgroundColor: 'rgba(74,144,217,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  missionXpText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.xpBlue,
  },
  ecoFactCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    overflow: 'hidden',
    ...SHADOWS.md,
    marginBottom: 8,
  },
  ecoFactTag: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(168,196,153,0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ecoFactText: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 24,
    fontWeight: '500',
  },
});
