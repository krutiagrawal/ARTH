import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { ProgressRing } from '../components/common/ProgressRing';
import { Mascot } from '../components/common/Mascot';
import { useFadeIn, useSlideUp, useScaleIn } from '../hooks/useAnimations';
import { useAuth } from '../context/AuthContext';
import {
  useAchievements,
  useStreakCalendar,
  useThemes,
  useSelectTheme,
  useLeaderboard,
} from '../hooks/useApiQueries';
import type { ApiAchievement } from '../api/achievements';
import type { StreakWeek } from '../api/streaks';
import type { ApiForestTheme } from '../api/themes';
import type { ApiUser } from '../api/auth';
import { getForestLevelLabel, getXpProgress } from '../constants/forestLevels';
import { ForestGallery } from '../components/stories/ForestGallery';

const { width: SW } = Dimensions.get('window');

function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return 'recently';
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function daysSince(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function ProfileHeader({
  navigation,
  user,
  rank,
}: {
  navigation: any;
  user: ApiUser | null;
  rank: number | null;
}) {
  const fadeStyle = useFadeIn(0);
  const insets = useSafeAreaInsets();
  const xpProgress = getXpProgress(user?.xp ?? 0, user?.level ?? 1);

  return (
    <Animated.View style={fadeStyle}>
      <LinearGradient
        colors={[COLORS.forest, COLORS.sageDark, COLORS.sageLight]}
        style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Settings button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation?.navigate('Settings')}
        >
          <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarArea}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate('EditProfile')}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmoji}>{user?.avatarEmoji ?? '🧑‍🌾'}</Text>
          </View>
          <View style={styles.levelRing}>
            <ProgressRing
              size={96}
              strokeWidth={4}
              progress={xpProgress.progress}
              color={COLORS.golden}
              trackColor="rgba(255,255,255,0.15)"
              delay={300}
            />
          </View>
          <View style={styles.levelLabel}>
            <Text style={styles.levelLabelText}>Lv.{user?.level ?? 1}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{user?.name ?? 'Planter'}</Text>
        <Text style={styles.profileHandle}>@{user?.handle ?? ''}</Text>
        <Text style={styles.profileJoined}>🌱 Planting since {formatJoinDate(user?.createdAt)}</Text>

        {/* Stats strip */}
        <BlurView intensity={20} tint="light" style={styles.statsStrip}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{user?.treesPlantedCount ?? 0}</Text>
            <Text style={styles.headerStatLabel}>Trees</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{user?.streakCurrent ?? 0}</Text>
            <Text style={styles.headerStatLabel}>Streak</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{user?.badgesCount ?? 0}</Text>
            <Text style={styles.headerStatLabel}>Badges</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{rank ? `#${rank}` : '—'}</Text>
            <Text style={styles.headerStatLabel}>Rank</Text>
          </View>
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );
}

function StreakCalendar({ streakCurrent, weeks }: { streakCurrent: number; weeks: StreakWeek[] }) {
  return (
    <GlassCard variant="dark" style={styles.streakCalCard}>
      <View style={styles.streakCalHeader}>
        <View>
          <Text style={styles.streakCalTitleDark}>Streak Calendar</Text>
          <Text style={styles.streakCalSubDark}>Current: {streakCurrent} days 🔥</Text>
        </View>
        <View style={styles.streakCountBadge}>
          <Text style={styles.streakCountNum}>{streakCurrent}</Text>
          <Text style={styles.streakCountFire}>🔥</Text>
        </View>
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.streakWeek}>
          <Text style={styles.streakWeekLabelDark}>{week.week.replace('Week ', 'W')}</Text>
          <View style={styles.streakDays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, di) => (
              <View key={di} style={styles.streakDayWrapper}>
                <View
                  style={[
                    styles.streakDay,
                    week.days[di] ? styles.streakDayFilled : styles.streakDayEmpty,
                  ]}
                >
                  {week.days[di] && <Text style={styles.streakDayCheck}>✓</Text>}
                </View>
                <Text style={styles.streakDayLabelDark}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

function AchievementItem({
  achievement,
  index,
  onPress,
}: {
  achievement: ApiAchievement;
  index: number;
  onPress: () => void;
}) {
  const scaleStyle = useScaleIn(index * 60);
  const rarityColors: Record<string, [string, string]> = {
    common: [COLORS.sage, COLORS.sageDark],
    rare: [COLORS.xpBlue, COLORS.xpBlueDark],
    epic: [COLORS.coral, '#C0392B'],
    legendary: [COLORS.golden, COLORS.earth],
  };
  const colors = rarityColors[achievement.rarity];

  return (
    <Animated.View style={scaleStyle}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={[styles.achievementCardDark, !achievement.unlocked && styles.achievementLocked]}>
          {achievement.unlocked ? (
            <LinearGradient colors={colors} style={styles.achievementIconBg}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.achievementIconBgLockedDark}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            </View>
          )}
          <Text style={[styles.achievementTitleDark, !achievement.unlocked && styles.achievementTitleLockedDark]}>
            {achievement.title}
          </Text>
          {!achievement.unlocked && achievement.progress !== undefined && (
            <View style={styles.achievementProgressBar}>
              <View
                style={[
                  styles.achievementProgressFill,
                  { width: `${(achievement.progress! / achievement.total!) * 100}%` as any },
                ]}
              />
            </View>
          )}
          <View style={[styles.rarityDot, { backgroundColor: colors[0] }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AchievementGrid({
  achievements,
  onSelect,
}: {
  achievements: ApiAchievement[];
  onSelect: (achievement: ApiAchievement) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? achievements : achievements.slice(0, 6);

  return (
    <View style={styles.achievementsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleDark}>Achievements</Text>
        <TouchableOpacity onPress={() => setShowAll(prev => !prev)}>
          <Text style={styles.seeAllDark}>{showAll ? 'Show less' : 'See all →'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.achievementGrid}>
        {displayed.map((achievement, i) => (
          <AchievementItem key={achievement.id} achievement={achievement} index={i} onPress={() => onSelect(achievement)} />
        ))}
      </View>
    </View>
  );
}

function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: ApiAchievement | null;
  onClose: () => void;
}) {
  const rarityColors: Record<string, [string, string]> = {
    common: [COLORS.sage, COLORS.sageDark],
    rare: [COLORS.xpBlue, COLORS.xpBlueDark],
    epic: [COLORS.coral, '#C0392B'],
    legendary: [COLORS.golden, COLORS.earth],
  };

  return (
    <Modal visible={!!achievement} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          {achievement && (
            <GlassCard variant="dark" style={styles.achievementModalCard}>
              <LinearGradient
                colors={rarityColors[achievement.rarity]}
                style={styles.achievementModalIconBg}
              >
                <Text style={styles.achievementModalIcon}>{achievement.icon}</Text>
              </LinearGradient>
              <Text style={styles.achievementModalTitle}>{achievement.title}</Text>
              <Text style={styles.achievementModalRarity}>{achievement.rarity.toUpperCase()}</Text>
              <Text style={styles.achievementModalDesc}>{achievement.description}</Text>
              {!achievement.unlocked && achievement.total !== undefined && (
                <View style={styles.achievementModalProgressWrap}>
                  <View style={styles.achievementProgressBar}>
                    <View
                      style={[
                        styles.achievementProgressFill,
                        { width: `${Math.min(100, (achievement.progress / achievement.total) * 100)}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.achievementModalProgressText}>
                    {achievement.progress} / {achievement.total}
                  </Text>
                </View>
              )}
              {achievement.unlocked && <Text style={styles.achievementModalUnlocked}>✓ Unlocked</Text>}
            </GlassCard>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Approximate one-way NY↔LA flight emissions per passenger, used only to give the CO₂ number a
// relatable frame of reference — not a precise figure.
const AVG_FLIGHT_CO2_KG = 180;

function ImpactStats({ user }: { user: ApiUser | null }) {
  const slideStyle = useSlideUp(150, 20);
  const co2 = user?.totalCo2Absorbed ?? 0;
  const flightsOffset = Math.max(0, co2 / AVG_FLIGHT_CO2_KG);
  const flightsLabel = flightsOffset >= 0.1 ? flightsOffset.toFixed(1) : '0';

  return (
    <Animated.View style={slideStyle}>
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forest]}
        style={styles.impactCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.impactTitle}>🌍 Your Total Impact</Text>
        <View style={styles.impactRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{co2.toFixed(1)}kg</Text>
            <Text style={styles.impactLabel}>CO₂ Absorbed</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{user?.treesPlantedCount ?? 0}</Text>
            <Text style={styles.impactLabel}>Trees Planted</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{daysSince(user?.createdAt)}</Text>
            <Text style={styles.impactLabel}>Days Active</Text>
          </View>
        </View>
        <View style={styles.impactEquivalent}>
          <Text style={styles.impactEquivText}>
            ≈ Offsetting {flightsLabel} NY–LA flight{flightsOffset === 1 ? '' : 's'} ✈️
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: achievements = [] } = useAchievements();
  const { data: streakWeeks = [] } = useStreakCalendar(4);
  const { data: themes = [] } = useThemes();
  const { data: leaderboard } = useLeaderboard('global');
  const selectThemeMutation = useSelectTheme();
  const [selectedAchievement, setSelectedAchievement] = useState<ApiAchievement | null>(null);

  const myRank = leaderboard?.myRank ?? null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader navigation={navigation} user={user} rank={myRank} />

        <View style={styles.body}>
          <ImpactStats user={user} />
          <StreakCalendar streakCurrent={user?.streakCurrent ?? 0} weeks={streakWeeks} />
          <AchievementGrid achievements={achievements} onSelect={setSelectedAchievement} />

          {/* Forest snapshots gallery */}
          <ForestGallery />

          {/* Forest themes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleDark}>Forest Themes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {themes.map((forestTheme: ApiForestTheme) => (
              <TouchableOpacity
                key={forestTheme.id}
                activeOpacity={0.8}
                onPress={() =>
                  forestTheme.unlocked
                    ? selectThemeMutation.mutate(forestTheme.id)
                    : Alert.alert('Locked', 'Keep planting trees to unlock this forest theme!')
                }
              >
                <GlassCard
                  variant={forestTheme.unlocked ? 'sage' : 'dark'}
                  style={[styles.themeCard, !forestTheme.unlocked && styles.themeCardLocked]}
                >
                  <Text style={styles.themeEmoji}>{forestTheme.preview}</Text>
                  <Text style={[styles.themeNameDark, forestTheme.unlocked && styles.themeNameUnlocked]}>
                    {forestTheme.name}
                  </Text>
                  {!forestTheme.unlocked && <Text style={styles.themeLockedDark}>🔒 Unlock</Text>}
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <AchievementDetailModal achievement={selectedAchievement} onClose={() => setSelectedAchievement(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {},
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 8,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  settingsBlur: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  settingsIcon: {
    fontSize: 18,
  },
  avatarArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarEmoji: {
    fontSize: 44,
  },
  levelRing: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  levelLabel: {
    position: 'absolute',
    bottom: -6,
    right: -4,
    backgroundColor: COLORS.golden,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  levelLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  profileHandle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  profileJoined: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  statsStrip: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  impactCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    gap: 12,
    ...SHADOWS.md,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  impactLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  impactEquivalent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    padding: 10,
  },
  impactEquivText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '500',
  },
  streakCalCard: {
    gap: 12,
  },
  streakCalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakCalTitleDark: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  streakCalSubDark: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  streakCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakCountNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.streakFire,
  },
  streakCountFire: {
    fontSize: 20,
  },
  streakWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakWeekLabelDark: {
    width: 24,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  streakDays: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  streakDayWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  streakDay: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayFilled: {
    backgroundColor: COLORS.sage,
  },
  streakDayEmpty: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  streakDayCheck: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  streakDayLabelDark: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  achievementsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAllDark: {
    fontSize: 13,
    color: COLORS.sageLight,
    fontWeight: '600',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementCardDark: {
    width: (SW - 32 - 24) / 3,
    alignItems: 'center',
    backgroundColor: 'rgba(13,35,24,0.45)',
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIconBgLockedDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 22,
  },
  achievementTitleDark: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 13,
  },
  achievementTitleLockedDark: {
    color: 'rgba(255,255,255,0.45)',
  },
  achievementProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(200,200,200,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: COLORS.xpBlue,
    borderRadius: 2,
  },
  rarityDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  themeCard: {
    width: 110,
    marginRight: 8,
    alignItems: 'center',
    padding: 14,
    gap: 6,
  },
  themeCardLocked: {
    opacity: 0.6,
  },
  themeEmoji: {
    fontSize: 32,
  },
  themeNameDark: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  /** The 'sage' GlassCard variant is a light translucent tint — on the light beige page
   * background that composites light too, so unlocked (sage-card) theme names need dark text
   * instead of the white used for locked (dark-card) themes. */
  themeNameUnlocked: {
    color: COLORS.forest,
  },
  themeLockedDark: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  achievementModalCard: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  achievementModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementModalIcon: {
    fontSize: 32,
  },
  achievementModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  achievementModalRarity: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sageLight,
    letterSpacing: 1,
  },
  achievementModalDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  achievementModalProgressWrap: {
    width: '100%',
    marginTop: 14,
    gap: 6,
  },
  achievementModalProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  achievementModalUnlocked: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sageLight,
    marginTop: 14,
  },
});
