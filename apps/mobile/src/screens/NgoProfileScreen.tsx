import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { ActionSheet, type ActionSheetOption } from '../components/social/ActionSheet';
import { ReportSheet } from '../components/social/ReportSheet';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { PostGrid } from '../components/profile/PostGrid';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { DrivesTabContent } from '../components/profile/DrivesTabContent';
import { useAuth } from '../context/AuthContext';
import { useBlockTarget, useNgoPosts } from '../hooks/useSocialQueries';
import {
  useNgoProfile,
  useNgoStats,
  useNgoStreakCalendar,
  useNgoAchievements,
  useNgoPublicAchievements,
  useNgoLeaderboard,
  useNgoPublicProfile,
  useFollowNgo,
  useUnfollowNgo,
  useMyDrives,
  useRingStatus,
} from '../hooks/useApiQueries';
import { currentStreakFromWeeks } from '../utils/streak';
import { resolveMediaUrl } from '../api/client';
import type { ApiPost } from '../api/posts';
import type { NgoStreakWeek } from '../api/ngoStreaks';

/** A weekly-cadence streak strip — one pill per week rather than the user app's 7-day-per-week
 * grid, since an NGO's streak counts consecutive WEEKS with an update posted, not days. Kept
 * local to this screen rather than force-fit into the shared `StreakCalendar` (day-grid) component,
 * whose 2D week-of-days shape doesn't match this 1D week-only data. */
function NgoStreakRow({ streakCurrent, weeks }: { streakCurrent: number; weeks: NgoStreakWeek[] }) {
  return (
    <GlassCard variant="dark" style={styles.streakCard}>
      <View style={styles.streakHeader}>
        <View>
          <Text style={styles.streakTitle}>Posting Streak</Text>
          <Text style={styles.streakSub}>Current: {streakCurrent} week{streakCurrent === 1 ? '' : 's'} 🔥</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeNum}>{streakCurrent}</Text>
          <Text style={styles.streakBadgeFire}>🔥</Text>
        </View>
      </View>
      <View style={styles.streakPills}>
        {weeks.map((w, i) => (
          <View key={i} style={styles.streakPillWrap}>
            <View style={[styles.streakPill, w.posted ? styles.streakPillFilled : styles.streakPillEmpty]}>
              {w.posted && <Text style={styles.streakPillCheck}>✓</Text>}
            </View>
            <Text style={styles.streakPillLabel} numberOfLines={1}>{w.weekLabel}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function followLabel(status: string | null, followersCount: number): string {
  if (status === 'accepted') return 'Following ✓';
  if (status === 'pending') return 'Requested';
  return `Follow · ${followersCount}`;
}

export function NgoProfileScreen({ route, navigation }: any) {
  const ngoId: string | undefined = route?.params?.ngoId;
  const isOwn = !ngoId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const ownProfile = useNgoProfile();
  const ownStats = useNgoStats();
  const ownStreak = useNgoStreakCalendar(8);
  const ownAchievements = useNgoAchievements();
  const ownLeaderboard = useNgoLeaderboard();
  const ownDrives = useMyDrives(isOwn);

  const publicProfile = useNgoPublicProfile(isOwn ? null : ngoId ?? null);
  const publicAchievements = useNgoPublicAchievements(isOwn ? undefined : ngoId);
  const followMutation = useFollowNgo();
  const unfollowMutation = useUnfollowNgo();
  const blockTarget = useBlockTarget();

  const effectiveNgoId = isOwn ? ownProfile.data?.id : ngoId;
  const ringStatus = useRingStatus({ ngoIds: effectiveNgoId ? [effectiveNgoId] : [] });
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNgoPosts(effectiveNgoId);
  const posts = useMemo(() => postsData?.pages.flatMap((p) => p.posts) ?? [], [postsData]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const openPost = useCallback(
    (post: ApiPost) => {
      if (!effectiveNgoId) return;
      navigation.navigate('ProfilePostFeed', { authorKind: 'ngo', authorId: effectiveNgoId, initialPostId: post.id });
    },
    [navigation, effectiveNgoId],
  );

  const isLoading = isOwn ? !ownProfile.data : !publicProfile.data;
  const weeks = isOwn ? ownStreak.data?.weeks ?? [] : [];
  const streakCurrent = currentStreakFromWeeks(weeks);
  const achievements = isOwn ? ownAchievements.data ?? [] : publicAchievements.data ?? [];
  const badgesCount = achievements.filter((a) => a.unlocked).length;
  const myRank = isOwn ? ownLeaderboard.data?.myRank ?? null : null;

  const name = isOwn ? ownProfile.data?.orgName ?? user?.name ?? 'Your NGO' : publicProfile.data?.orgName ?? 'NGO';
  const logoUrl = resolveMediaUrl(isOwn ? ownProfile.data?.logoUrl : publicProfile.data?.logoUrl);
  const city = isOwn ? ownProfile.data?.city : publicProfile.data?.city;
  const bio = isOwn ? ownProfile.data?.description : publicProfile.data?.description;
  const followStatus = isOwn ? null : publicProfile.data?.followStatus ?? null;
  const isFollowingOrPending = followStatus === 'accepted' || followStatus === 'pending';
  const followersCount = isOwn ? undefined : publicProfile.data?.followersCount ?? 0;

  const drives = isOwn
    ? ownDrives.data ?? []
    : (publicProfile.data?.featuredDrives ?? []).map((d: any) => ({
        id: d.id,
        title: d.title,
        photoUri: d.photoUrl,
        city: d.city,
        startsAt: d.startsAt,
      }));

  const toggleFollow = () => {
    if (!ngoId) return;
    if (isFollowingOrPending) unfollowMutation.mutate(ngoId);
    else followMutation.mutate(ngoId);
  };

  const menuOptions: ActionSheetOption[] = [
    { key: 'report', icon: '🚩', label: 'Report this organisation', onPress: () => setReporting(true) },
    {
      key: 'block',
      icon: '🚫',
      label: 'Block',
      hint: 'Hides their posts and stories from you',
      destructive: true,
      onPress: () => ngoId && blockTarget.mutate({ ngoId }, { onSuccess: () => navigation.goBack() }),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {!isOwn ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <BlurView intensity={25} tint="dark" style={styles.iconBlur}>
              <Text style={styles.iconText}>←</Text>
            </BlurView>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
        )}
        <Text style={styles.topBarTitle} numberOfLines={1}>{name}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => navigation.navigate('NgoSettings')} style={styles.iconButton}>
            <BlurView intensity={25} tint="dark" style={styles.iconBlur}>
              <Text style={styles.iconText}>⚙️</Text>
            </BlurView>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconButton} hitSlop={8}>
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <PostGrid
          posts={tab === 'posts' ? posts : []}
          onPressPost={openPost}
          onEndReached={tab === 'posts' ? onEndReached : undefined}
          isFetchingNextPage={isFetchingNextPage}
          emptyTitle="No posts yet"
          ListHeaderComponent={
            <>
              <ProfileHeader
                avatarUrl={logoUrl}
                avatarEmoji="🌿"
                storyRing={effectiveNgoId ? ringStatus.data?.ngos[effectiveNgoId] : null}
                name={name}
                meta={city ? `📍 ${city}` : null}
                bio={bio}
                stats={
                  isOwn
                    ? [
                        { value: ownStats.data?.totalDrives ?? 0, label: 'Drives' },
                        { value: streakCurrent, label: 'Streak' },
                        { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
                        { value: myRank ? `#${myRank}` : '—', label: 'Rank' },
                      ]
                    : [
                        { value: posts.length, label: 'Posts' },
                        {
                          value: followersCount ?? 0,
                          label: 'Followers',
                          onPress: () => effectiveNgoId && navigation.navigate('PublicFollowers', { kind: 'ngo', id: effectiveNgoId, name }),
                        },
                        { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
                      ]
                }
                primaryAction={
                  isOwn
                    ? { label: 'Edit profile', onPress: () => navigation.navigate('NgoSettings'), variant: 'outline' }
                    : {
                        label: followLabel(followStatus, followersCount ?? 0),
                        onPress: toggleFollow,
                        busy: followMutation.isPending || unfollowMutation.isPending,
                        variant: isFollowingOrPending ? 'outline' : 'solid',
                      }
                }
                hint={
                  !isOwn && followStatus === 'pending'
                    ? `${name} approves each follower. Tap again to cancel your request.`
                    : null
                }
              />
              <ProfileTabBar activeTab={tab} onChange={setTab} />
              {tab === 'contributions' && (
                <View style={styles.tabBody}>
                  <GlassCard variant="dark" style={styles.contributionsCard}>
                    <Text style={styles.contributionsTitle}>🌍 Impact so far</Text>
                    <View style={styles.contributionsRow}>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>
                          {isOwn ? ownStats.data?.co2AbsorptionKg ?? 0 : publicProfile.data?.impact?.total ?? 0}
                        </Text>
                        <Text style={styles.contributionsLabel}>{isOwn ? 'kg CO₂ absorbed' : 'Trees tracked'}</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>
                          {isOwn ? ownStats.data?.totalDrives ?? 0 : `${publicProfile.data?.impact?.survivalRate ?? 0}%`}
                        </Text>
                        <Text style={styles.contributionsLabel}>{isOwn ? 'Drives run' : 'Survival rate'}</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>
                          {isOwn ? ownStats.data?.volunteersInvolved ?? 0 : followersCount ?? 0}
                        </Text>
                        <Text style={styles.contributionsLabel}>{isOwn ? 'Volunteers' : 'Followers'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </View>
              )}
              {tab === 'achievements' && (
                <AchievementsTabContent
                  achievements={achievements}
                  customStreak={isOwn && weeks.length > 0 ? <NgoStreakRow streakCurrent={streakCurrent} weeks={weeks} /> : undefined}
                />
              )}
              {tab === 'drives' && (
                <DrivesTabContent
                  role="ngo"
                  drives={drives}
                  onPressDrive={(d) => navigation.navigate('DriveDetail', { driveId: d.id })}
                />
              )}
            </>
          }
        />
      )}

      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={name} options={menuOptions} />
      <ReportSheet visible={reporting} onClose={() => setReporting(false)} targetType="ngo" targetId={ngoId ?? null} targetLabel="this organisation" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconText: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  menuDots: { fontSize: 20, color: COLORS.textSecondary },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  contributionsLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  streakCard: { gap: 12, marginBottom: 16 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  streakSub: { fontSize: 12, color: COLORS.white, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakBadgeNum: { fontSize: 24, fontWeight: '800', color: COLORS.streakFire },
  streakBadgeFire: { fontSize: 20 },
  streakPills: { flexDirection: 'row', gap: 6 },
  streakPillWrap: { flex: 1, alignItems: 'center', gap: 4 },
  streakPill: { width: '100%', height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  streakPillFilled: { backgroundColor: COLORS.sage },
  streakPillEmpty: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  streakPillCheck: { fontSize: 12, color: COLORS.white, fontWeight: '700' },
  streakPillLabel: { fontSize: 8, color: COLORS.white, fontWeight: '600' },
});
