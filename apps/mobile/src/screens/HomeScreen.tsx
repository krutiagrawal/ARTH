import React, { useState, useRef, type RefObject } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { Mascot, MascotBubble } from '../components/common/Mascot';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { EcoWidget } from '../components/common/EcoWidget';
import { ProgressRing } from '../components/common/ProgressRing';
import { AnimatedButton } from '../components/common/AnimatedButton';
import {
  useFadeIn,
  useSlideUp,
  useSpringPress,
} from '../hooks/useAnimations';
import { useTimeTheme, isNightlikePeriod, type TimeTheme } from '../hooks/useTimeTheme';
import { MuteButton } from '../components/common/MuteButton';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { TreeCard } from '../components/common/TreeCard';
import { Sheet } from '../components/common/Sheet';
import { useHaptics } from '../hooks/useHaptics';
import { useAuth } from '../context/AuthContext';
import { useTrees, useTodayMissions, useEcoFacts, useCompleteMission } from '../hooks/useApiQueries';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import type { ApiUser } from '../api/auth';
import type { ApiTree } from '../api/trees';
import type { ApiDailyMission } from '../api/missions';
import type { ApiWeather } from '../api/weather';
import { getForestLevelLabel, getXpProgress } from '../constants/forestLevels';
import { hexToRgba } from '../utils/color';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { getHeroSeamColor } from '../utils/heroSeam';

const { width: SW, height: SH } = Dimensions.get('window');
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

/** Forces text to full/partial white during 'night'/'lateNight' — HomeScreen only. Does NOT touch
 * useTimeTheme.ts's per-period values, since that hook is shared by Forest/NGO/Corporate/Group
 * dashboards too and this ask was scoped to Home. A plain function (not a hook) so it can be
 * called from HomeScreen's child components that read their own `theme` locally (MissionCard,
 * RecentTrees, EcoFactCard) as well as from HeroSection (which receives `theme` as a prop). */
function homeTextColor(theme: TimeTheme, base: string, opts?: { secondary?: boolean }): string {
  if (!isNightlikePeriod(theme.period)) return base;
  return opts?.secondary ? ON_DARK_SURFACE.secondary : ON_DARK_SURFACE.primary;
}

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
  blurTarget,
}: {
  theme: TimeTheme;
  user: ApiUser | null;
  navigation: any;
  onNavigateTab: (tab: string) => void;
  weather: ApiWeather | null;
  blurTarget: RefObject<View | null>;
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
          onError={(e: any) => console.warn('[HeroSection] hero image failed to load:', e.nativeEvent.error)}
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
        <EcoWidget
          icon={(user?.streakCurrent ?? 0) > 0 ? '🔥' : '💤'}
          value={user?.streakCurrent ?? 0}
          label={`day${(user?.streakCurrent ?? 0) !== 1 ? 's' : ''}`}
          variant="glass"
          dark
          color={homeTextColor(theme, theme.accentColor)}
          cardBackground={theme.cardBackground}
          cardBackgroundAlt={theme.cardBackgroundAlt}
          cardOverlayAlpha={theme.cardOverlayAlpha}
          textColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
          subTextColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
          borderColor={theme.cardBorder}
          delay={0}
          blurTarget={blurTarget}
        />
        <View style={styles.statsRight}>
          <EcoWidget
            icon="🌿"
            value={user?.treesPlantedCount ?? 0}
            label="Trees"
            variant="glass"
            dark
            color={homeTextColor(theme, theme.accentColor)}
            cardBackground={theme.cardBackground}
            cardBackgroundAlt={theme.cardBackgroundAlt}
            cardOverlayAlpha={theme.cardOverlayAlpha}
            textColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
            subTextColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
            borderColor={theme.cardBorder}
            delay={100}
            onPress={() => onNavigateTab('Map')}
            blurTarget={blurTarget}
          />
          <EcoWidget
            icon="💨"
            value={`${(user?.totalCo2Absorbed ?? 0).toFixed(1)}kg`}
            label="CO₂"
            variant="glass"
            dark
            color={homeTextColor(theme, theme.accentColor)}
            cardBackground={theme.cardBackground}
            cardBackgroundAlt={theme.cardBackgroundAlt}
            cardOverlayAlpha={theme.cardOverlayAlpha}
            textColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
            subTextColor={homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true })}
            borderColor={theme.cardBorder}
            delay={200}
            onPress={() => navigation.navigate('Profile')}
            blurTarget={blurTarget}
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
        blurTarget={blurTarget}
        style={styles.forestStats}
        pointerEvents="none"
      >
        <View style={[styles.forestStatsOverlay, { backgroundColor: hexToRgba(theme.cardBackground, theme.cardOverlayAlpha) }]} />
        <View style={styles.forestStatRow}>
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>{user?.treesPlantedCount ?? 0}</Text>
            <Text style={[styles.forestStatLabel, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>Trees</Text>
          </View>
          <View style={[styles.forestStatDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>{(user?.totalCo2Absorbed ?? 0).toFixed(1)}</Text>
            <Text style={[styles.forestStatLabel, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>kg CO₂</Text>
          </View>
          <View style={[styles.forestStatDivider, { backgroundColor: theme.cardBorder }]} />
          <View style={styles.forestStat}>
            <Text style={[styles.forestStatNum, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>Lv.{user?.level ?? 1}</Text>
            <Text style={[styles.forestStatLabel, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>Forest</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

function MissionCard({ missions, navigation, blurTarget }: { missions: ApiDailyMission[]; navigation: any; blurTarget: RefObject<View | null> }) {
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
        blurTarget={blurTarget}
        style={[styles.missionCard, { borderColor: theme.cardBorder, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }]}
      >
        <LinearGradient
          colors={[hexToRgba(theme.cardBackground, theme.cardOverlayAlpha), hexToRgba(theme.cardBackgroundAlt, theme.cardOverlayAlpha)]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.8 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.missionHeader}>
          <View>
            <Text style={[styles.missionTag, { color: homeTextColor(theme, theme.accentColor) }]}>DAILY MISSIONS</Text>
            <Text style={[styles.missionTitle, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>Today's Quests</Text>
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
                  <Text style={[styles.missionCheckIcon, { color: homeTextColor(theme, COLORS.forestDeep) }]}>{mission.completed ? '✓' : ''}</Text>
                </View>
                <Text style={styles.missionIcon}>{mission.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionItemTitle, { color: homeTextColor(theme, theme.textPrimaryOnCard) }, mission.completed && styles.missionItemDoneText]}>
                    {mission.title}
                  </Text>
                  <Text style={[styles.missionItemDesc, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>{mission.description}</Text>
                </View>
                <View style={styles.missionXp}>
                  <Text style={[styles.missionXpText, { color: homeTextColor(theme, COLORS.xpBlue) }]}>+{mission.xpReward} XP</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </Animated.View>
  );
}

function RecentTrees({ trees, onNavigateTab, blurTarget }: { trees: ApiTree[]; onNavigateTab: (tab: string) => void; blurTarget: RefObject<View | null> }) {
  const slideStyle = useSlideUp(200, 24);
  const theme = useTimeTheme();
  const recentTrees = trees.slice(0, 4);

  return (
    <Animated.View style={slideStyle}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textOnSky }]}>Recent Plants</Text>
        <TouchableOpacity onPress={() => onNavigateTab('Map')}>
          <Text style={[styles.seeAll, { color: homeTextColor(theme, theme.accentColor) }]}>See all →</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.treeScroll}>
        {recentTrees.map(tree => (
          <TreeCard
            key={tree.id}
            tree={tree}
            size="chip"
            theme={theme}
            onPress={() => onNavigateTab('Map')}
            style={styles.treeCardSpacing}
            blurTarget={blurTarget}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function EcoFactCard({ fact, blurTarget }: { fact: string; blurTarget: RefObject<View | null> }) {
  const slideStyle = useSlideUp(300, 24);
  const theme = useTimeTheme();
  return (
    <Animated.View style={slideStyle}>
      <BlurView
        intensity={35}
        tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
        blurTarget={blurTarget}
        style={[styles.ecoFactCard, { borderColor: theme.cardBorder, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }]}
      >
        <LinearGradient
          colors={[hexToRgba(theme.cardBackground, theme.cardOverlayAlpha), hexToRgba(theme.cardBackgroundAlt, theme.cardOverlayAlpha)]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.8 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={[styles.ecoFactTag, { color: homeTextColor(theme, theme.accentColor) }]}>🌍 ECO INSIGHT</Text>
        <Text style={[styles.ecoFactText, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>{fact}</Text>
      </BlurView>
    </Animated.View>
  );
}

/** The primary "take action" entry point — the single most important tap target on Home. Sits
 * right below the hero, ahead of the XP card and quests, so the real-world mission always
 * outranks the gamification below it. Opens GrowActionSheet's four contribution paths. */
function HomeGrowCTA({ theme, onPress }: { theme: TimeTheme; onPress: () => void }) {
  const { medium } = useHaptics();
  const { style: pressStyle, onPressIn, onPressOut } = useSpringPress();
  const slideStyle = useSlideUp(100, 20);

  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          medium();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Take action for the Earth today"
      >
        <Animated.View style={pressStyle}>
          <LinearGradient
            colors={[theme.accentColor, COLORS.forest]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.growCta}
          >
            <View style={styles.growCtaIconWrap}>
              <Text style={styles.growCtaIcon}>🌱</Text>
            </View>
            <View style={styles.growCtaTextWrap}>
              <Text style={styles.growCtaTitle}>Take action for the Earth</Text>
              <Text style={styles.growCtaSubtitle}>Plant, adopt, join a drive, or give</Text>
            </View>
            <Text style={styles.growCtaArrow}>›</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface GrowAction {
  key: 'plant' | 'adopt' | 'ngo' | 'donate';
  icon: string;
  title: string;
  subtitle: string;
}

const GROW_ACTIONS: GrowAction[] = [
  { key: 'plant', icon: '🌱', title: 'Plant by myself', subtitle: 'Snap a photo and add a real tree to your forest' },
  { key: 'adopt', icon: '🌳', title: 'Adopt a nearby tree', subtitle: 'Take care of a tree already growing near you' },
  { key: 'ngo', icon: '🤝', title: 'Join an NGO drive', subtitle: 'Plant alongside a local planting event' },
  { key: 'donate', icon: '💚', title: 'Donate to an NGO', subtitle: 'Support verified tree-planting organizations' },
];

const GROW_ACTION_ROUTES: Record<Exclude<GrowAction['key'], 'plant'>, string> = {
  adopt: 'AdoptTreeList',
  ngo: 'Drives',
  donate: 'Campaigns',
};

/** The four contribution paths behind HomeGrowCTA — all real, backend-connected flows. */
function GrowActionSheet({
  visible,
  onClose,
  navigation,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  theme: TimeTheme;
}) {
  const { selection } = useHaptics();

  const handlePick = (key: GrowAction['key']) => {
    selection();
    onClose();
    if (key === 'plant') {
      navigation.navigate('PlantTree');
      return;
    }
    navigation.navigate(GROW_ACTION_ROUTES[key]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="How would you like to help?" variant="slideUp">
      {GROW_ACTIONS.map(action => (
        <TouchableOpacity
          key={action.key}
          style={styles.growActionRow}
          activeOpacity={0.8}
          onPress={() => handlePick(action.key)}
        >
          <Text style={styles.growActionIcon}>{action.icon}</Text>
          <View style={styles.growActionTextWrap}>
            <Text style={[styles.growActionTitle, { color: homeTextColor(theme, COLORS.textPrimary) }]}>{action.title}</Text>
            <Text style={[styles.growActionSubtitle, { color: homeTextColor(theme, COLORS.textPrimary, { secondary: true }) }]}>{action.subtitle}</Text>
          </View>
          <Text style={[styles.growActionArrow, { color: homeTextColor(theme, COLORS.textPrimary) }]}>›</Text>
        </TouchableOpacity>
      ))}
    </Sheet>
  );
}

export function HomeScreen({ navigation, onNavigateTab }: any) {
  const theme = useTimeTheme();
  const bottomNavClearance = useBottomNavClearance();
  const { user } = useAuth();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const [growSheetVisible, setGrowSheetVisible] = useState(false);
  // blurMethod is intentionally omitted (Android "dimezisBlurView*" crashes the RenderThread on
  // Android 16 here, since blurTarget is an ancestor of the BlurViews sampling it) — cards fake
  // glass depth with a diagonal sheen instead; blurTargetRef stays wired up as a harmless no-op.
  const blurTargetRef = useRef<View>(null);

  const { data: trees = [] } = useTrees(4);
  const { data: missions = [] } = useTodayMissions();
  const { data: ecoFacts = [] } = useEcoFacts();

  const todayFact = ecoFacts.length > 0 ? ecoFacts[new Date().getDate() % ecoFacts.length] : '';
  const forestLevelLabel = getForestLevelLabel(user?.level ?? 1);
  const xpProgress = getXpProgress(user?.xp ?? 0, user?.level ?? 1);

  return (
    <BlurTargetView ref={blurTargetRef} collapsable={false} style={[styles.container, { backgroundColor: getHeroSeamColor(theme) }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomNavClearance }]}
      >
        {/* Illustrated hero — header, stat row, scenery, and stats pill all scroll together as
            one normal-flow block instead of a fixed backdrop the rest of the page scrolls over. */}
        <HeroSection theme={theme} user={user} navigation={navigation} onNavigateTab={onNavigateTab} weather={weather} blurTarget={blurTargetRef} />

        {/* Primary "take action" entry point — outranks quests/XP below it in hierarchy */}
        <View style={styles.growCtaSection}>
          <HomeGrowCTA theme={theme} onPress={() => setGrowSheetVisible(true)} />
        </View>

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
            blurTarget={blurTargetRef}
            style={[styles.xpCard, { borderColor: theme.cardBorder, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }]}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(theme.cardBackground, theme.cardOverlayAlpha) }]} />
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 0.8 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.xpContent}>
              <View>
                <Text style={[styles.xpLevel, { color: homeTextColor(theme, theme.accentColor) }]}>{forestLevelLabel}</Text>
                <Text style={[styles.xpSubLabel, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>Forest Level</Text>
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
              <Text style={[styles.xpBarLabel, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>
                {xpProgress.current} / {xpProgress.needed} XP to next level
              </Text>
            </View>
          </BlurView>
        </View>

        <MissionCard missions={missions} navigation={navigation} blurTarget={blurTargetRef} />
        <RecentTrees trees={trees} onNavigateTab={onNavigateTab} blurTarget={blurTargetRef} />
        {todayFact ? <EcoFactCard fact={todayFact} blurTarget={blurTargetRef} /> : null}
      </ScrollView>

      {/* Ambient scenery — rendered last so it drifts on top of everything, a constant animation.
          Reacts to real detected weather: rain when rainy, a windy breeze when cold, leaves otherwise. */}
      <View style={styles.ambientLayer} pointerEvents="none">
        <AmbientCreatures period={theme.period} fireflyAreaHeight={SH * 0.55} />
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

      <GrowActionSheet
        visible={growSheetVisible}
        onClose={() => setGrowSheetVisible(false)}
        navigation={navigation}
        theme={theme}
      />
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const,
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
    color: COLORS.textPrimary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forestStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 4,
  },
  growCtaSection: {
    marginBottom: 18,
  },
  growCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 14,
    ...SHADOWS.sage,
  },
  growCtaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  growCtaIcon: {
    fontSize: 26,
  },
  growCtaTextWrap: {
    flex: 1,
  },
  growCtaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  growCtaSubtitle: {
    fontSize: 13,
    color: COLORS.white,
    marginTop: 2,
  },
  growCtaArrow: {
    fontSize: 26,
    color: COLORS.white,
    fontWeight: '300',
  },
  growActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  growActionIcon: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  growActionTextWrap: {
    flex: 1,
  },
  growActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  growActionSubtitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  growActionArrow: {
    fontSize: 22,
    color: COLORS.textPrimary,
    fontWeight: '300',
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
    color: COLORS.white,
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
    color: COLORS.white,
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
  treeCardSpacing: {
    marginRight: 10,
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
    color: COLORS.white,
  },
  missionItemDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.white,
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
