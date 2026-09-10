import React, { useRef, type RefObject } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { SHADOWS, RADIUS } from '../constants/theme';
import { EcoWidget } from '../components/common/EcoWidget';
import { IconBadge } from '../components/common/IconBadge';
import { ThemedCard } from '../components/common/ThemedCard';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { MuteButton } from '../components/common/MuteButton';
import { MascotBubble } from '../components/common/Mascot';
import { ProgressRing } from '../components/common/ProgressRing';
import { useTimeTheme, type TimeTheme } from '../hooks/useTimeTheme';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import { useAuth } from '../context/AuthContext';
import { useGroupProfile, useGroupStats } from '../hooks/useApiQueries';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { getHeroSeamColor, getHeroSeamTextColors } from '../utils/heroSeam';
import { getXpProgress } from '../constants/forestLevels';
import type { GroupTabName } from '../navigation/AppNavigator';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = SH * 0.4;

interface GroupDashboardScreenProps {
  navigation: any;
  onNavigateTab: (tab: GroupTabName) => void;
}

function InviteCodeCard({ theme, code, blurTarget }: { theme: TimeTheme; code: string | undefined; blurTarget: RefObject<View | null> }) {
  const animStyle = useSlideUp(60, 20);
  return (
    <Animated.View style={animStyle}>
      <ThemedCard theme={theme} style={styles.inviteCard} blurTarget={blurTarget}>
        <Text style={[styles.inviteLabel, { color: COLORS.textSecondary }]}>Invite code</Text>
        <Text style={[styles.inviteValue, { color: theme.accentColor }]}>{code ?? '········'}</Text>
        <Text style={[styles.inviteHint, { color: COLORS.textSecondary }]}>Share this so members can join from their own account.</Text>
      </ThemedCard>
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

export function GroupDashboardScreen({ navigation, onNavigateTab }: GroupDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user } = useAuth();
  const { data: profile } = useGroupProfile();
  const { data: stats, isLoading } = useGroupStats();
  const statsAnim = useFadeIn(80);

  const pageBackground = getHeroSeamColor(theme);
  const seamText = getHeroSeamTextColors(theme);
  const blurTargetRef = useRef<View>(null);

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
            <Image source={theme.heroImage} style={{ position: 'absolute', top: 0, left: 0, width: SW, height: HERO_HEIGHT }} resizeMode="cover" />
          ) : (
            <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={10} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', pageBackground]}
            style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.28 }]}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[styles.greeting, { color: theme.textOnSky }]}>{theme.greeting} {theme.emoji}</Text>
              <Text style={[styles.groupName, { color: theme.textOnSky }]}>{profile?.groupName ?? user?.name ?? 'Your group'}</Text>
            </View>
            <View style={styles.headerRight}>
              <MuteButton />
              <TouchableOpacity style={styles.avatarButton} onPress={() => navigation.navigate('GroupProfile')}>
                <LinearGradient colors={[COLORS.sageLight, COLORS.forest]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{profile?.avatarEmoji ?? user?.avatarEmoji ?? '👥'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <EcoWidget
              icon="👥"
              value={stats?.memberCount ?? 0}
              label="Members"
              variant="outline"
              color={theme.accentColor}
              delay={100}
              onPress={() => onNavigateTab('Manage')}
            />
            <EcoWidget
              icon="🌳"
              value={stats?.treesPlantedTotal ?? 0}
              label="Trees"
              variant="outline"
              color={theme.accentColor}
              delay={200}
            />
            <EcoWidget
              icon="🔥"
              value={profile?.streakCurrent ?? 0}
              label="Streak"
              variant="outline"
              color={theme.accentColor}
              delay={300}
              onPress={() => navigation.navigate('GroupProfile')}
            />
          </View>
        </View>

        <InviteCodeCard theme={theme} code={profile?.inviteCode} blurTarget={blurTargetRef} />

        <View style={styles.mascotSection}>
          <MascotBubble
            message={
              (profile?.streakCurrent ?? 0) > 0
                ? `Your group is on a ${profile?.streakCurrent}-day streak! Keep it going 🌱`
                : "Plant something today to start your group's streak 🌱"
            }
            size={88}
            mood="encouraging"
          />
        </View>

        {stats && (
          <View style={styles.xpRow}>
            <ThemedCard theme={theme} style={styles.xpCard} blurTarget={blurTargetRef}>
              <View style={styles.xpContent}>
                <View>
                  <Text style={[styles.xpLevel, { color: theme.accentColor }]}>Lv.{stats.level}</Text>
                  <Text style={[styles.xpSubLabel, { color: COLORS.textSecondary }]}>Group Level</Text>
                </View>
                <ProgressRing
                  size={54}
                  strokeWidth={5}
                  progress={getXpProgress(stats.xpTotal, stats.level).progress}
                  color={theme.accentColor}
                  trackColor={theme.accentColorSoft}
                  label={`${Math.round(getXpProgress(stats.xpTotal, stats.level).progress * 100)}%`}
                  delay={300}
                />
              </View>
              <Text style={[styles.xpHint, { color: COLORS.textSecondary }]}>
                Combined XP from everyone in the group – {getXpProgress(stats.xpTotal, stats.level).current}/{getXpProgress(stats.xpTotal, stats.level).needed} to the next level
              </Text>
            </ThemedCard>
          </View>
        )}

        {isLoading || !stats ? (
          <ActivityIndicator color={theme.accentColor} style={styles.loader} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Your Group's Impact</Text>
            <Animated.View style={statsAnim}>
              <View style={styles.gridRow}>
                <EcoWidget {...tileProps} icon="🌳" value={String(stats.treesPlantedTotal)} label="Trees planted" delay={0} />
                <EcoWidget {...tileProps} icon="⚡" value={String(stats.xpTotal)} label="XP earned" delay={60} />
                <EcoWidget {...tileProps} icon="🌍" value={`${Math.round(stats.co2AbsorbedTotal)}kg`} label="CO₂ absorbed" delay={120} />
              </View>
            </Animated.View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Quick Actions</Text>

        {/* Manage/Activity/Settings already have their own bottom-nav tab — only the things
            that don't live in the tab bar get a Quick Action here. */}
        <QuickAction
          theme={theme}
          delay={120}
          emoji="🏅"
          color={COLORS.golden}
          title="Group profile"
          body="Your public page – badges, rank, and forest gallery."
          onPress={() => navigation.navigate('GroupProfile')}
          blurTarget={blurTargetRef}
        />
        <QuickAction
          theme={theme}
          delay={160}
          emoji="🔥"
          color={COLORS.streakFire}
          title="Group streak"
          body="See your group's current streak and best record."
          onPress={() => navigation.navigate('GroupStreak')}
          blurTarget={blurTargetRef}
        />
        <QuickAction
          theme={theme}
          delay={190}
          emoji="🏆"
          color={COLORS.sage}
          title="Start a challenge"
          body="Set a shared goal for your group to work toward."
          onPress={() => navigation.navigate('GroupCreateChallenge')}
          blurTarget={blurTargetRef}
        />
      </ScrollView>

      <View style={styles.ambientLayer} pointerEvents="none">
        <AmbientCreatures period={theme.period} fireflyAreaHeight={HERO_HEIGHT} />
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
  groupName: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarButton: {},
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sage },
  avatarText: { fontSize: 22 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  loader: { marginTop: 20, marginBottom: 8 },

  inviteCard: { marginBottom: 4, alignItems: 'center' },
  inviteLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  inviteValue: { fontSize: 26, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  inviteHint: { fontSize: 12, marginTop: 6, textAlign: 'center' },

  mascotSection: { paddingLeft: 8 },
  xpRow: {},
  xpCard: { gap: 10 },
  xpContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevel: { fontSize: 16, fontWeight: '700' },
  xpSubLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  xpHint: { fontSize: 12, lineHeight: 17 },

  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },

  sectionTitle: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 27, marginTop: 20 },
  actionCard: { marginBottom: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionTextColumn: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionBody: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '600' },
});
