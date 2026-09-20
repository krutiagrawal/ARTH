import React, { useRef, type RefObject } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { SHADOWS } from '../constants/theme';
import { EcoWidget } from '../components/common/EcoWidget';
import { ThemedCard } from '../components/common/ThemedCard';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { Mascot } from '../components/common/Mascot';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { useTimeTheme, type TimeTheme } from '../hooks/useTimeTheme';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import { useAuth } from '../context/AuthContext';
import { useNgoStats, useNgoStreakCalendar, useNgoProfile } from '../hooks/useApiQueries';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { currentStreakFromWeeks } from '../utils/streak';
import { getHeroSeamColor, getHeroSeamTextColors } from '../utils/heroSeam';
import { hexToRgba } from '../utils/color';
import type { NgoTabName } from '../navigation/AppNavigator';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = SH * 0.54;

/** How many recent weeks the streak card shows as leaf glyphs. */
const STREAK_WEEKS_SHOWN = 5;

/** Periods dark/saturated enough that the streak leaves need to switch off green — see StreakLeafIcon. */
const EVENING_PERIODS = new Set(['sunset', 'blueHour', 'night', 'lateNight']);

/**
 * One streak-day leaf, drawn as a vector path instead of the 🌿 emoji it replaces.
 *
 * The emoji is a fixed-palette glyph, so it can't be recolored — it stayed green (and low-opacity
 * green when empty) even once the card itself went dark at evening/night, where green-on-indigo is
 * nearly invisible. A plain fill color lets the leaf switch to gold/white on those periods.
 */
function StreakLeafIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M12 2C7 2 3 6 3 12c0 5 4 9 9 9 0-7 3-13 9-15-2-2-5-4-9-4z" fill={color} />
    </Svg>
  );
}

type NgoManageSegment = 'drives' | 'campaigns' | 'trees';

interface NgoDashboardScreenProps {
  navigation: any;
  onNavigateTab: (tab: NgoTabName, manageSegment?: NgoManageSegment) => void;
}

function StreakCard({
  theme,
  streakCurrent,
  recentWeeks,
  onPress,
  blurTarget,
}: {
  theme: TimeTheme;
  streakCurrent: number;
  recentWeeks: { posted: boolean }[];
  onPress: () => void;
  blurTarget: RefObject<View | null>;
}) {
  const animStyle = useSlideUp(60, 20);
  const hasStreak = streakCurrent > 0;
  const isEvening = EVENING_PERIODS.has(theme.period);
  const leafColorFilled = isEvening ? COLORS.golden : COLORS.sage;
  const leafColorEmpty = COLORS.sage;
  const leafOpacityEmpty = isEvening ? 0.35 : 0.25;

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <ThemedCard theme={theme} style={styles.streakCard} blurTarget={blurTarget}>
          <View style={styles.streakRowOuter}>
            <Mascot size={64} animate={false} />
            <View style={styles.streakTextColumn}>
              <Text style={[styles.streakTitle, { color: theme.textPrimaryOnCard }]}>
                {hasStreak ? 'Keep your streak alive!' : 'Start your streak today!'}
              </Text>
              <Text style={[styles.streakSubtitle, { color: theme.textSecondaryOnCard }]}>Plant. Track. Impact.</Text>

              <Text style={[styles.streakLabel, { color: theme.textSecondaryOnCard }]}>Current streak</Text>
              <View style={styles.streakRow}>
                <Text style={[styles.streakValue, { color: theme.accentColor }]}>
                  {streakCurrent} {streakCurrent === 1 ? 'week' : 'weeks'}
                </Text>
                <View style={styles.streakLeaves}>
                  {recentWeeks.map((week, i) => (
                    <StreakLeafIcon
                      key={i}
                      color={week.posted ? leafColorFilled : leafColorEmpty}
                      opacity={week.posted ? 1 : leafOpacityEmpty}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ThemedCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface DockActionSpec {
  key: string;
  emoji: string;
  color: string;
  title: string;
  badge?: number;
  onPress: () => void;
}

// Circular icon shortcut, matching nursery's dashboard dock — a payments-app-style quick-actions
// row instead of another stack of full-width cards.
function DockItem({
  seamText,
  delay,
  emoji,
  color,
  title,
  badge,
  onPress,
}: {
  seamText: { primary: string; secondary: string };
  delay: number;
  emoji: string;
  color: string;
  title: string;
  badge?: number;
  onPress: () => void;
}) {
  const animStyle = useSlideUp(delay, 16);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.dockTouchable}>
        <View style={styles.dockIconWrap}>
          <LinearGradient
            colors={[color, hexToRgba(color, 0.65)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dockIconCircle}
          >
            <Text style={styles.dockIconEmoji}>{emoji}</Text>
          </LinearGradient>
          {!!badge && (
            <View style={styles.dockBadge}>
              <Text style={styles.dockBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.dockLabel, { color: seamText.secondary }]} numberOfLines={2}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Equal-width flex columns so a row of 3 lines up under the row above it.
function DockRow({
  seamText,
  items,
  delayStart,
}: {
  seamText: { primary: string; secondary: string };
  items: (DockActionSpec | null)[];
  delayStart: number;
}) {
  return (
    <View style={styles.dockGridRow}>
      {items.map((item, i) =>
        item ? (
          <View key={item.key} style={styles.dockSlot}>
            <DockItem
              seamText={seamText}
              delay={delayStart + i * 30}
              emoji={item.emoji}
              color={item.color}
              title={item.title}
              badge={item.badge}
              onPress={item.onPress}
            />
          </View>
        ) : (
          <View key={`empty-${i}`} style={styles.dockSlot} />
        )
      )}
    </View>
  );
}

export function NgoDashboardScreen({ navigation, onNavigateTab }: NgoDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { data: stats, isLoading, refetch: refetchStats } = useNgoStats();
  const { data: streakData, refetch: refetchStreak } = useNgoStreakCalendar(8);
  const { refreshing, onRefresh } = usePullToRefresh([refetchStats, refetchStreak, refetchProfile]);
  const streakCurrent = streakData ? currentStreakFromWeeks(streakData.weeks) : 0;
  const recentWeeks = (streakData?.weeks ?? []).slice(-STREAK_WEEKS_SHOWN);
  const statsAnim = useFadeIn(80);
  const blurTargetRef = useRef<View>(null);

  // The page below the hero follows the illustration's ground tone, exactly as the user-facing
  // Home screen does — a fixed cream page made every period look identical below the fold.
  const pageBackground = getHeroSeamColor(theme);
  // Headings sit directly on that flat page background (not inside a card), so they need its
  // text colours — not `theme.textOnSky` (for the sky illustration above, white at Golden
  // Hour/Sunset i.e. invisible here) and not `theme.textPrimaryOnCard` (calibrated for text
  // inside a tinted glass card, not the page itself).
  const seamText = getHeroSeamTextColors(theme);

  /** Shared props for the six "Your Impact" tiles: real glass cards tinted from the time-of-day
   * theme (same recipe as StreakCard/QuickAction), stretched to equal size. */
  const tileProps = {
    variant: 'glass' as const,
    fill: true,
    style: styles.gridTile,
    color: theme.accentColor,
    dark: theme.cardTint === 'dark',
    cardBackground: theme.cardBackground,
    cardBackgroundAlt: theme.cardBackgroundAlt,
    cardOverlayAlpha: theme.cardOverlayAlpha,
    borderColor: theme.cardBorder,
    textColor: theme.textPrimaryOnCard,
    subTextColor: theme.textSecondaryOnCard,
    blurTarget: blurTargetRef,
  };

  // Drives/Campaigns/Trees creation stays on the Manage tab, which already has its own bottom-tab
  // entry — same reasoning nursery uses to keep Orders/Edit Profile out of its dock. Post an
  // update, Followers and View on Map are likewise left out: Post/Followers already live under
  // the Community tab, and Map now has its own bottom-tab entry.
  const dockActions: DockActionSpec[] = [
    { key: 'survival', emoji: '🩺', color: COLORS.sage, title: 'Survival & impact', onPress: () => navigation.navigate('NgoHealthCheck') },
    { key: 'plantedTrees', emoji: '🌳', color: COLORS.forest, title: 'Log planted trees', onPress: () => navigation.navigate('NgoLogPlantedTrees') },
    { key: 'bulkRequirements', emoji: '🤝', color: COLORS.amber, title: 'Bulk requirements', onPress: () => navigation.navigate('NgoBulkRequirements') },
    { key: 'streak', emoji: '🔥', color: COLORS.sage, title: 'Growth & Trust', onPress: () => navigation.navigate('NgoStreakBadges') },
    { key: 'volunteers', emoji: '🙋', color: COLORS.coral, title: 'Volunteers', onPress: () => navigation.navigate('NgoVolunteers') },
    { key: 'staff', emoji: '🧑‍🤝‍🧑', color: COLORS.warmBrown, title: 'Staff roster', onPress: () => navigation.navigate('NgoStaff') },
    { key: 'donations', emoji: '💸', color: COLORS.sageDark, title: 'Donations', onPress: () => navigation.navigate('NgoDonations') },
    { key: 'reports', emoji: '📊', color: COLORS.streakGold, title: 'Reports', onPress: () => navigation.navigate('NgoReports') },
    { key: 'portfolio', emoji: '📚', color: COLORS.earth, title: 'Past work', onPress: () => navigation.navigate('NgoPortfolio') },
  ];

  const dockRows: DockActionSpec[][] = [];
  for (let i = 0; i < dockActions.length; i += 3) {
    dockRows.push(dockActions.slice(i, i + 3));
  }

  return (
    <BlurTargetView ref={blurTargetRef} collapsable={false} style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <View style={[styles.heroSection, { height: HERO_HEIGHT }]}>
          {theme.heroImage ? (
            <Image
              source={theme.heroImage}
              style={{ position: 'absolute', top: 0, left: 0, width: SW, height: HERO_HEIGHT }}
              resizeMode="cover"
              onError={(e: any) => console.warn('[NgoDashboard] hero image failed to load:', e.nativeEvent.error)}
              onLoad={() => console.log('[NgoDashboard] hero image loaded ok for period:', theme.period)}
            />
          ) : (
            <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={14} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', pageBackground]}
            style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.24 }]}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[styles.greeting, { color: theme.textOnSky }]}>{theme.greeting} {theme.emoji}</Text>
              <Text style={[styles.orgName, { color: theme.textOnSky }]}>{profile?.orgName ?? user?.name ?? 'Your NGO'}</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('NgoProfile')}>
              <LinearGradient colors={[COLORS.sageLight, COLORS.forest]} style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.avatarEmoji ?? '🌱'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <EcoWidget
              icon="🤝"
              value={stats?.upcomingDrives ?? 0}
              label="Drives"
              variant="glass"
              dark
              color={theme.accentColor}
              cardBackground={theme.cardBackground}
              cardBackgroundAlt={theme.cardBackgroundAlt}
              cardOverlayAlpha={theme.cardOverlayAlpha}
              textColor={theme.textSecondaryOnCard}
              subTextColor={theme.textSecondaryOnCard}
              borderColor={theme.cardBorder}
              delay={0}
              onPress={() => onNavigateTab('Manage')}
              blurTarget={blurTargetRef}
            />
            <View style={styles.statsRight}>
              <EcoWidget
                icon="🔥"
                value={streakCurrent}
                label="Streak"
                variant="glass"
                dark
                color={theme.accentColor}
                cardBackground={theme.cardBackground}
                cardBackgroundAlt={theme.cardBackgroundAlt}
                cardOverlayAlpha={theme.cardOverlayAlpha}
                textColor={theme.textSecondaryOnCard}
                subTextColor={theme.textSecondaryOnCard}
                borderColor={theme.cardBorder}
                delay={100}
                onPress={() => navigation.navigate('NgoStreakBadges')}
                blurTarget={blurTargetRef}
              />
              <EcoWidget
                icon="🌍"
                value={`${stats?.co2AbsorptionKg ?? 0}kg`}
                label="CO₂"
                variant="glass"
                dark
                color={theme.accentColor}
                cardBackground={theme.cardBackground}
                cardBackgroundAlt={theme.cardBackgroundAlt}
                cardOverlayAlpha={theme.cardOverlayAlpha}
                textColor={theme.textSecondaryOnCard}
                subTextColor={theme.textSecondaryOnCard}
                borderColor={theme.cardBorder}
                delay={200}
                blurTarget={blurTargetRef}
              />
            </View>
          </View>
        </View>

        <StreakCard
          theme={theme}
          streakCurrent={streakCurrent}
          recentWeeks={recentWeeks}
          onPress={() => navigation.navigate('NgoStreakBadges')}
          blurTarget={blurTargetRef}
        />

        {isLoading || !stats ? (
          <ActivityIndicator color={theme.accentColor} style={styles.loader} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Your Impact</Text>
            <Text style={[styles.sectionSubtitle, { color: seamText.secondary }]}>
              This is what you have achieved so far
            </Text>
            {/* 2x2 grid of `flex: 1` tiles — two explicit rows rather than a wrapping container,
                same reasoning as the hero row: guarantees four equal-size cards regardless of
                label length. Every tile is tappable through to where its underlying data lives. */}
            <Animated.View style={statsAnim}>
              <View style={styles.gridRow}>
                <EcoWidget
                  {...tileProps}
                  icon="🤝"
                  value={String(stats.upcomingDrives)}
                  label="Drives"
                  delay={0}
                  onPress={() => onNavigateTab('Manage', 'drives')}
                />
                <EcoWidget
                  {...tileProps}
                  icon="🌳"
                  value={String(stats.treesAdopted)}
                  label="Trees"
                  delay={60}
                  onPress={() => onNavigateTab('Manage', 'trees')}
                />
              </View>
              <View style={styles.gridRow}>
                <EcoWidget
                  {...tileProps}
                  icon="💰"
                  value={`₹${(stats.totalRaisedCents / 100).toLocaleString()}`}
                  label="Raised"
                  delay={120}
                  onPress={() => navigation.navigate('NgoDonations')}
                />
                <EcoWidget
                  {...tileProps}
                  icon="📢"
                  value={String(stats.activeCampaigns)}
                  label="Campaigns"
                  delay={180}
                  onPress={() => onNavigateTab('Manage', 'campaigns')}
                />
              </View>
            </Animated.View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Quick Actions</Text>
        <View style={styles.dockGrid}>
          {dockRows.map((row, i) => (
            <DockRow
              key={i}
              seamText={seamText}
              delayStart={120 + i * 90}
              items={row.length === 3 ? row : [...row, ...Array(3 - row.length).fill(null)]}
            />
          ))}
        </View>
      </ScrollView>

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
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollContent: { paddingHorizontal: 16, gap: 8 },
  heroSection: { position: 'relative', overflow: 'hidden', marginHorizontal: -16 },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  orgName: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  avatarButton: {},
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sage },
  avatarText: { fontSize: 22 },
  // Same shape as Home's hero stat row: one card standalone, the other two wrapped in a `flex: 1`
  // row so all three read as the same natural-sized glass card, not stretched pills.
  statsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  statsRight: { flex: 1, flexDirection: 'row', gap: 8 },
  loader: { marginTop: 20, marginBottom: 8 },

  // `alignItems: 'stretch'` is what equalises tile heights — without it the shortest label sets
  // its own card's height and the row looks ragged.
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },

  streakCard: { marginBottom: 4 },
  streakRowOuter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakTextColumn: { flex: 1 },
  streakTitle: { fontSize: 15, fontWeight: '700' },
  streakSubtitle: { fontSize: 12, marginTop: 2 },
  streakLabel: { fontSize: 11, marginTop: 10 },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  streakValue: { fontSize: 18, fontWeight: '700' },
  streakLeaves: { flexDirection: 'row', gap: 2 },

  sectionTitle: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 27, marginTop: 20 },
  sectionSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },

  dockGrid: { marginTop: 4 },
  dockGridRow: { flexDirection: 'row' },
  dockSlot: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  dockTouchable: { alignItems: 'center' },
  dockIconWrap: { position: 'relative' },
  dockIconCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  dockIconEmoji: { fontSize: 25 },
  dockBadge: { position: 'absolute', top: -3, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dockBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  dockLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
