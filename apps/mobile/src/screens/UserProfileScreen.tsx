import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { Toast } from '../components/common/Toast';
import { ActionSheet, type ActionSheetOption } from '../components/social/ActionSheet';
import { ReportSheet } from '../components/social/ReportSheet';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { PostGrid } from '../components/profile/PostGrid';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { DrivesTabContent } from '../components/profile/DrivesTabContent';
import { ForestThemesPicker } from '../components/profile/ForestThemesPicker';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useSoundSystem } from '../hooks/useSoundSystem';
import { useUserPosts, useBlockTarget } from '../hooks/useSocialQueries';
import {
  useAchievements,
  useUserAchievements,
  useStreakCalendar,
  useLeaderboard,
  usePublicProfile,
  useSendFriendRequest,
  useRemoveFriend,
  useRespondFriendRequest,
  useJoinedDrives,
  useUserJoinedDrives,
  useRingStatus,
  useThemes,
  useSelectTheme,
} from '../hooks/useApiQueries';
import { getXpProgress } from '../constants/forestLevels';
import type { ApiPost } from '../api/posts';

function friendLabel(status: 'none' | 'pending' | 'accepted'): string {
  if (status === 'accepted') return 'Friends ✓';
  if (status === 'pending') return 'Requested';
  return 'Add Friend';
}

function friendIcon(status: 'none' | 'pending' | 'accepted'): string {
  if (status === 'accepted') return '✓';
  if (status === 'pending') return '🕓';
  return '＋';
}

export function UserProfileScreen({ route, navigation }: any) {
  const userId: string | undefined = route?.params?.userId;
  const friendRequestId: string | undefined = route?.params?.friendRequestId;
  const friendRequestFromName: string | undefined = route?.params?.friendRequestFromName;
  const isOwn = !userId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { playSound } = useSoundSystem();
  const respondFriendRequest = useRespondFriendRequest();
  const blockTarget = useBlockTarget();
  const [pendingRequest, setPendingRequest] = useState(!!friendRequestId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const ownAchievements = useAchievements();
  const { data: streakWeeks = [] } = useStreakCalendar(4);
  const { data: leaderboard } = useLeaderboard('global');
  const ownDrives = useJoinedDrives();
  const { data: themes = [] } = useThemes();
  const selectThemeMutation = useSelectTheme();

  const ringStatus = useRingStatus({ userIds: !isOwn && userId ? [userId] : [] });
  const publicProfile = usePublicProfile(isOwn ? null : userId ?? null);
  const publicAchievements = useUserAchievements(isOwn ? undefined : userId);
  const publicDrives = useUserJoinedDrives(isOwn ? undefined : userId);
  const sendFriendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserPosts(isOwn ? user?.id : userId);
  const posts = useMemo(() => postsData?.pages.flatMap((p) => p.posts) ?? [], [postsData]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const profileUserId = isOwn ? user?.id : userId;
  const openPost = useCallback(
    (post: ApiPost) => {
      if (!profileUserId) return;
      navigation.navigate('ProfilePostFeed', { authorKind: 'user', authorId: profileUserId, initialPostId: post.id });
    },
    [navigation, profileUserId],
  );

  const isLoading = isOwn ? !user : !publicProfile.data;
  const myRank = isOwn ? leaderboard?.myRank ?? null : null;
  const achievements = isOwn ? ownAchievements.data ?? [] : publicAchievements.data ?? [];
  const drives = isOwn ? ownDrives.data ?? [] : publicDrives.data ?? [];

  const name = isOwn ? user?.name ?? 'Planter' : publicProfile.data?.name ?? 'Planter';
  const handle = isOwn ? user?.handle : publicProfile.data?.handle;
  const bio = isOwn ? user?.bio : publicProfile.data?.bio;
  const avatarEmoji = isOwn ? user?.avatarEmoji : publicProfile.data?.avatarEmoji;
  const level = isOwn ? user?.level ?? 1 : publicProfile.data?.level ?? 1;
  const xp = isOwn ? user?.xp ?? 0 : 0;
  const treesPlanted = isOwn ? user?.treesPlantedCount ?? 0 : publicProfile.data?.treesPlantedCount ?? 0;
  const streakCurrent = isOwn ? user?.streakCurrent ?? 0 : publicProfile.data?.streakCurrent ?? 0;
  const badgesCount = isOwn ? user?.badgesCount ?? 0 : publicProfile.data?.badgesCount ?? 0;
  const friendStatus = isOwn ? 'accepted' : publicProfile.data?.friendStatus ?? 'none';

  const toggleFriend = () => {
    if (!userId) return;
    if (friendStatus === 'accepted') {
      confirm('Remove friend?', `You and ${name} will no longer be friends.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFriend.mutate(userId) },
      ]);
    } else if (friendStatus === 'none') {
      sendFriendRequest.mutate(userId);
    }
  };

  const acceptRequest = () => {
    if (!friendRequestId) return;
    respondFriendRequest.mutate(
      { id: friendRequestId, action: 'accept' },
      {
        onSuccess: () => {
          setPendingRequest(false);
          setToastMessage(`Hey, you are now friends with ${friendRequestFromName ?? name}!`);
          playSound('friendAccepted');
        },
      },
    );
  };

  const declineRequest = () => {
    if (!friendRequestId) return;
    respondFriendRequest.mutate({ id: friendRequestId, action: 'decline' }, { onSuccess: () => navigation.goBack() });
  };

  const menuOptions: ActionSheetOption[] = !isOwn
    ? [
        ...(friendStatus === 'accepted'
          ? [
              {
                key: 'remove',
                icon: '💔',
                label: 'Remove friend',
                destructive: true,
                onPress: () =>
                  confirm('Remove friend?', `You and ${name} will no longer be friends.`, [
                    { text: 'Cancel', style: 'cancel' as const },
                    { text: 'Remove', style: 'destructive' as const, onPress: () => userId && removeFriend.mutate(userId) },
                  ]),
              },
            ]
          : []),
        { key: 'report', icon: '🚩', label: 'Report this person', onPress: () => setReporting(true) },
        {
          key: 'block',
          icon: '🚫',
          label: 'Block this person',
          hint: 'Hides their posts and stories both ways',
          destructive: true,
          onPress: () =>
            confirm(`Block ${name}?`, 'You will stop seeing each other on PLANT.', [
              { text: 'Cancel', style: 'cancel' as const },
              {
                text: 'Block',
                style: 'destructive' as const,
                onPress: () => userId && blockTarget.mutate({ userId }, { onSuccess: () => navigation.goBack() }),
              },
            ]),
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {!isOwn ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>←</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation?.navigate('Groups')} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>👥</Text>
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.topBarTitle} numberOfLines={1}>{name}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => navigation?.navigate('Settings')} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>⚙️</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconButton} hitSlop={8}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>⋯</Text>
            </View>
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
              {pendingRequest && (
                <View style={styles.requestBanner}>
                  <Text style={styles.requestBannerText}>Wants to be your friend</Text>
                  <View style={styles.requestBannerActions}>
                    <TouchableOpacity style={styles.requestBannerAccept} onPress={acceptRequest} disabled={respondFriendRequest.isPending}>
                      <Text style={styles.requestBannerAcceptText}>✓ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.requestBannerDecline} onPress={declineRequest} disabled={respondFriendRequest.isPending}>
                      <Text style={styles.requestBannerDeclineText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <ProfileHeader
                avatarEmoji={avatarEmoji ?? '🧑‍🌾'}
                xpProgress={isOwn ? { progress: getXpProgress(xp, level).progress, level } : null}
                storyRing={!isOwn && userId ? ringStatus.data?.users[userId] : null}
                name={name}
                handle={handle}
                bio={bio}
                stats={[
                  { value: treesPlanted, label: 'Trees' },
                  { value: streakCurrent, label: 'Streak' },
                  { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
                  ...(isOwn ? [{ value: myRank ? `#${myRank}` : '—', label: 'Rank' }] : []),
                ]}
                primaryAction={
                  isOwn
                    ? { label: 'Edit profile', icon: '✎', onPress: () => navigation?.navigate('EditProfile'), variant: 'outline' }
                    : {
                        label: friendLabel(friendStatus),
                        icon: friendIcon(friendStatus),
                        onPress: toggleFriend,
                        busy: friendStatus === 'pending' || sendFriendRequest.isPending || removeFriend.isPending,
                        variant: friendStatus === 'accepted' ? 'outline' : friendStatus === 'pending' ? 'pending' : 'solid',
                      }
                }
              />
              <ProfileTabBar activeTab={tab} onChange={setTab} />
              {tab === 'contributions' && (
                <View style={styles.tabBody}>
                  <BorderCard style={styles.contributionsCard}>
                    <Text style={styles.contributionsTitle}>🌍 Total impact</Text>
                    <View style={styles.contributionsRow}>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>
                          {isOwn ? Number(user?.totalCo2Absorbed ?? 0).toFixed(1) : '—'}kg
                        </Text>
                        <Text style={styles.contributionsLabel}>CO₂ absorbed</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{treesPlanted}</Text>
                        <Text style={styles.contributionsLabel}>Trees planted</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{drives.length}</Text>
                        <Text style={styles.contributionsLabel}>Drives joined</Text>
                      </View>
                    </View>
                  </BorderCard>
                </View>
              )}
              {tab === 'achievements' && (
                <View style={{ gap: 16 }}>
                  <AchievementsTabContent
                    achievements={achievements}
                    xp={isOwn ? { xp, level } : null}
                    streak={isOwn ? { streakCurrent, weeks: streakWeeks } : undefined}
                    showForestGallery={isOwn}
                  />
                  {isOwn && (
                    <View style={styles.tabBody}>
                      <ForestThemesPicker
                        themes={themes}
                        onSelectUnlocked={(t) => selectThemeMutation.mutate(t.id)}
                        onSelectLocked={() => confirm('Locked', 'Keep planting trees to unlock this forest theme!')}
                      />
                    </View>
                  )}
                </View>
              )}
              {tab === 'drives' && (
                <DrivesTabContent
                  role="user"
                  drives={drives}
                  onPressDrive={(d) => navigation.navigate('DriveDetail', { driveId: d.id })}
                />
              )}
            </>
          }
        />
      )}

      {!isOwn && (
        <>
          <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={name} options={menuOptions} />
          <ReportSheet visible={reporting} onClose={() => setReporting(false)} targetType="user" targetId={userId ?? null} targetLabel={name} />
        </>
      )}
      <Toast visible={!!toastMessage} message={toastMessage ?? ''} icon="🌱" onHide={() => setToastMessage(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  iconText: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  requestBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.earth,
    alignItems: 'center',
    gap: 10,
  },
  requestBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  requestBannerActions: { flexDirection: 'row', gap: 10, width: '100%' },
  requestBannerAccept: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.lg, backgroundColor: COLORS.sage },
  requestBannerAcceptText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  requestBannerDecline: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.earth },
  requestBannerDeclineText: { fontSize: 14, fontWeight: '800', color: COLORS.earthDark },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  contributionsLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
