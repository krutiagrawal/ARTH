import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { PostGrid } from '../components/profile/PostGrid';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { DrivesTabContent } from '../components/profile/DrivesTabContent';
import { ForestThemesPicker } from '../components/profile/ForestThemesPicker';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useGroupPosts } from '../hooks/useSocialQueries';
import {
  useGroupProfile,
  useGroupStats,
  useGroupAchievements,
  useGroupAchievementsForMember,
  useGroupLeaderboard,
  useGroupPublicProfile,
  useGroupDrives,
  useLeaveGroup,
  useGroupThemes,
  useSelectGroupTheme,
  useRingStatus,
} from '../hooks/useApiQueries';
import { getXpProgress } from '../constants/forestLevels';
import type { ApiPost } from '../api/posts';

export function GroupProfileScreen({ route, navigation }: any) {
  const groupId: string | undefined = route?.params?.groupId;
  const isOwn = !groupId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const confirm = useConfirm();

  const ownProfile = useGroupProfile();
  const ownStats = useGroupStats();
  const ownAchievements = useGroupAchievements();
  const ownLeaderboard = useGroupLeaderboard();
  const { data: themes = [] } = useGroupThemes();
  const selectThemeMutation = useSelectGroupTheme();

  const publicProfile = useGroupPublicProfile(isOwn ? undefined : groupId);
  const publicAchievements = useGroupAchievementsForMember(isOwn ? undefined : groupId);
  const publicDrives = useGroupDrives(isOwn ? undefined : groupId);
  const leaveGroupMutation = useLeaveGroup();

  const effectiveGroupId = isOwn ? ownProfile.data?.id : groupId;
  const ringStatus = useRingStatus({ groupIds: effectiveGroupId ? [effectiveGroupId] : [] });
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGroupPosts(effectiveGroupId);
  const posts = useMemo(() => postsData?.pages.flatMap((p) => p.posts) ?? [], [postsData]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const openPost = useCallback(
    (post: ApiPost) => {
      if (!effectiveGroupId) return;
      navigation.navigate('ProfilePostFeed', { authorKind: 'group', authorId: effectiveGroupId, initialPostId: post.id });
    },
    [navigation, effectiveGroupId],
  );

  const isLoading = isOwn ? !ownProfile.data : !publicProfile.data;
  const achievements = isOwn ? ownAchievements.data ?? [] : publicAchievements.data ?? [];
  const badgesCount = achievements.filter((a) => a.unlocked).length;
  const myRank = isOwn ? ownLeaderboard.data?.myRank ?? null : null;
  const xpProgress = isOwn ? getXpProgress(ownStats.data?.xpTotal ?? 0, ownStats.data?.level ?? 1) : null;

  const name = isOwn ? ownProfile.data?.groupName ?? user?.name ?? 'Your group' : publicProfile.data?.groupName ?? 'Group';
  const handle = isOwn ? ownProfile.data?.handle : publicProfile.data?.handle;
  const avatarEmoji = isOwn ? ownProfile.data?.avatarEmoji : publicProfile.data?.avatarEmoji;
  const bio = isOwn ? undefined : publicProfile.data?.description;
  const streakCurrent = isOwn ? ownProfile.data?.streakCurrent ?? 0 : publicProfile.data?.streakCurrent ?? 0;
  const memberCount = isOwn ? ownStats.data?.memberCount ?? 0 : publicProfile.data?.memberCount ?? 0;
  const isMember = isOwn ? true : publicProfile.data?.isMember ?? false;
  const drives = isOwn ? [] : publicDrives.data ?? [];

  const handleLeave = () => {
    if (!groupId) return;
    confirm('Leave this group?', `You'll stop seeing ${name}'s activity and stories.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveGroupMutation.mutate(groupId, { onSuccess: () => navigation.goBack() }) },
    ]);
  };

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
          <TouchableOpacity onPress={() => navigation.navigate('GroupMembers')} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>👥</Text>
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.topBarTitle} numberOfLines={1}>{name}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => navigation.navigate('GroupSettings')} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>⚙️</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.iconButton} />
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
          showEmptyState={tab === 'posts'}
          ListHeaderComponent={
            <>
              <ProfileHeader
                avatarEmoji={avatarEmoji ?? '🌳'}
                xpProgress={xpProgress ? { progress: xpProgress.progress, level: ownStats.data?.level ?? 1 } : null}
                storyRing={!isOwn && effectiveGroupId ? ringStatus.data?.groups[effectiveGroupId] : null}
                name={name}
                handle={handle}
                bio={bio}
                stats={
                  isOwn
                    ? [
                        { value: myRank ? `#${myRank}` : '—', label: 'Rank' },
                        { value: memberCount, label: 'Members' },
                        { value: streakCurrent, label: 'Streak' },
                        { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
                      ]
                    : [
                        { value: posts.length, label: 'Posts' },
                        { value: memberCount, label: 'Members' },
                        { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
                      ]
                }
                primaryAction={
                  isOwn
                    ? { label: 'Edit profile', onPress: () => navigation.navigate('EditGroupProfile'), variant: 'outline' }
                    : isMember
                      ? { label: 'Leave group', onPress: handleLeave, variant: 'destructive', busy: leaveGroupMutation.isPending }
                      : null
                }
                hint={!isOwn && !isMember ? 'Join with an invite code to become a member.' : null}
              />
              <ProfileTabBar activeTab={tab} onChange={setTab} />
              {tab === 'contributions' && (
                <View style={styles.tabBody}>
                  <BorderCard style={styles.contributionsCard}>
                    <Text style={styles.contributionsTitle}>🌍 Group impact</Text>
                    <View style={styles.contributionsRow}>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.co2AbsorbedTotal ?? 0 : '—'}</Text>
                        <Text style={styles.contributionsLabel}>kg CO₂ absorbed</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.treesPlantedTotal ?? 0 : '—'}</Text>
                        <Text style={styles.contributionsLabel}>Trees planted</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{memberCount}</Text>
                        <Text style={styles.contributionsLabel}>Members</Text>
                      </View>
                    </View>
                  </BorderCard>
                </View>
              )}
              {tab === 'achievements' && (
                <View style={{ gap: 16 }}>
                  <AchievementsTabContent achievements={achievements} showForestGallery={isOwn} />
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
                  role="group"
                  drives={drives}
                  onPressDrive={(d) => navigation.navigate('DriveDetail', { driveId: d.id })}
                />
              )}
            </>
          }
        />
      )}
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
  },
  iconText: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  contributionsLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
