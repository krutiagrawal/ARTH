import React, { useRef, type RefObject } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
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
import { IconBadge } from '../components/common/IconBadge';
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
import { currentStreakFromWeeks } from '../utils/streak';
import { getHeroSeamColor, getHeroSeamTextColors } from '../utils/heroSeam';
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

interface NgoDashboardScreenProps {
  navigation: any;
  onNavigateTab: (tab: NgoTabName) => void;
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
              <Text style={[styles.streakTitle, { color: COLORS.textPrimary }]}>
                {hasStreak ? 'Keep your streak alive!' : 'Start your streak today!'}
              </Text>
              <Text style={[styles.streakSubtitle, { color: COLORS.textSecondary }]}>Plant. Track. Impact.</Text>

              <Text style={[styles.streakLabel, { color: COLORS.textSecondary }]}>Current streak</Text>
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

function QuickAction({
  theme,
  delay,
  emoji,
  color,
  title,
  body,
  onPress,
  blurTarget,
}: {
  theme: TimeTheme;
  delay: number;
  emoji: string;
  color: string;
  title: string;
  body: string;
  onPress: () => void;
  blurTarget: RefObject<View | null>;
}) {
  const animStyle = useSlideUp(delay, 18);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <ThemedCard theme={theme} style={styles.actionCard} blurTarget={blurTarget}>
          <View style={styles.actionRow}>
            <IconBadge icon={emoji} color={color} round />
            <View style={styles.actionTextColumn}>
              <Text style={[styles.actionTitle, { color: COLORS.textPrimary }]}>{title}</Text>
              <Text style={[styles.actionBody, { color: COLORS.textSecondary }]}>{body}</Text>
            </View>
            <Text style={[styles.chevron, { color: COLORS.textSecondary }]}>›</Text>
          </View>
        </ThemedCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function NgoDashboardScreen({ navigation, onNavigateTab }: NgoDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user } = useAuth();
  const { data: profile } = useNgoProfile();
  const { data: stats, isLoading } = useNgoStats();
  const { data: streakData } = useNgoStreakCalendar(8);
  const streakCurrent = streakData ? currentStreakFromWeeks(streakData.weeks) : 0;
  const recentWeeks = (streakData?.weeks ?? []).slice(-STREAK_WEEKS_SHOWN);
  const statsAnim = useFadeIn(80);
  const blurTargetRef = useRef<View>(null);

  // The page below the hero follows the illustration's ground tone, exactly as the user-facing
  // Home screen does — a fixed cream page made every period look identical below the fold.
  const pageBackground = getHeroSeamColor(theme);
  // Headings sit on that background, so they need its text colours — not `theme.textOnSky`, which
  // is for the sky illustration above and is white at Golden Hour/Sunset, i.e. invisible here.
  const seamText = getHeroSeamTextColors(theme);

  /** Shared props for the six "Your Impact" tiles: theme-tinted, and stretched to equal size. */
  const tileProps = {
    variant: 'outline' as const,
    fill: true,
    style: styles.gridTile,
    color: theme.accentColor,
  };

  return (
    <BlurTargetView ref={blurTargetRef} collapsable={false} style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
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
              variant="outline"
              color={theme.accentColor}
              delay={100}
              onPress={() => onNavigateTab('Manage')}
            />
            <EcoWidget
              icon="🔥"
              value={streakCurrent}
              label="Streak"
              variant="outline"
              color={theme.accentColor}
              delay={200}
              onPress={() => navigation.navigate('NgoProfile')}
            />
          </View>
        </View>

        <StreakCard
          theme={theme}
          streakCurrent={streakCurrent}
          recentWeeks={recentWeeks}
          onPress={() => navigation.navigate('NgoPostUpdate')}
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
            {/* Two explicit rows of three rather than one wrapping container: with `flexWrap` the
                tiles are content-sized, so six labels of differing length wrapped 3/2/1 at uneven
                widths. Fixed rows of `flex: 1` tiles guarantee six equal cards. */}
            <Animated.View style={statsAnim}>
              <View style={styles.gridRow}>
                <EcoWidget {...tileProps} icon="🤝" value={String(stats.upcomingDrives)} label="Upcoming drives" delay={0} />
                <EcoWidget {...tileProps} icon="📢" value={String(stats.activeCampaigns)} label="Active campaigns" delay={60} />
                <EcoWidget {...tileProps} icon="🌳" value={String(stats.treesAdopted)} label="Trees adopted" delay={120} />
              </View>
              <View style={styles.gridRow}>
                <EcoWidget {...tileProps} icon="💰" value={`₹${(stats.totalRaisedCents / 100).toLocaleString()}`} label="Raised" delay={180} />
                <EcoWidget {...tileProps} icon="👥" value={String(stats.volunteersInvolved)} label="Volunteers" delay={240} />
                <EcoWidget {...tileProps} icon="🌍" value={`${stats.co2AbsorptionKg}kg`} label="CO₂ potential" delay={300} />
              </View>
            </Animated.View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Quick Actions</Text>

        <QuickAction
          theme={theme}
          delay={120}
          emoji="📸"
          color={COLORS.golden}
          title="Post an update"
          body="Share real-time updates with your followers."
          onPress={() => navigation.navigate('NgoPostUpdate')}
          blurTarget={blurTargetRef}
        />
        <QuickAction
          theme={theme}
          delay={160}
          emoji="🩺"
          color={COLORS.sage}
          title="Survival & impact"
          body="Log tree survival and track impact."
          onPress={() => navigation.navigate('NgoHealthCheck')}
          blurTarget={blurTargetRef}
        />
        <QuickAction
          theme={theme}
          delay={200}
          emoji="📋"
          color={COLORS.earth}
          title="Manage drives"
          body="View and manage all your drives."
          onPress={() => onNavigateTab('Manage')}
          blurTarget={blurTargetRef}
        />
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
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
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
  actionCard: { marginBottom: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionTextColumn: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionBody: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '600' },
});
