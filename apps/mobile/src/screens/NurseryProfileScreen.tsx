import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { LocationActions } from '../components/common/LocationActions';
import { ReportSheet } from '../components/social/ReportSheet';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { PostGrid } from '../components/profile/PostGrid';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { NurserySaplingsTabContent } from '../components/profile/NurserySaplingsTabContent';
import { useNurseryPosts } from '../hooks/useSocialQueries';
import {
  useNurseryProfile,
  useNurseryStats,
  useNurseryStreakCalendar,
  useNurseryBadges,
  useNurseryPublicAchievements,
  useNurseryPublicProfile,
  useFollowNursery,
  useUnfollowNursery,
  useRingStatus,
  useSaplingStock,
} from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import type { ApiPost } from '../api/posts';

function followLabel(status: string | null, followersCount: number): string {
  if (status === 'accepted') return 'Following ✓';
  if (status === 'pending') return 'Requested';
  return `Follow · ${followersCount}`;
}

export function NurseryProfileScreen({ route, navigation }: any) {
  const nurseryId: string | undefined = route?.params?.nurseryId;
  const isOwn = !nurseryId;
  const insets = useSafeAreaInsets();
  const saplingsScrollRef = useRef<ScrollView>(null);

  const ownProfile = useNurseryProfile();
  const ownStats = useNurseryStats();
  const ownStreak = useNurseryStreakCalendar(6);
  const ownAchievements = useNurseryBadges();

  const publicProfile = useNurseryPublicProfile(isOwn ? null : nurseryId ?? null);
  const publicAchievements = useNurseryPublicAchievements(isOwn ? undefined : nurseryId);
  const ownStock = useSaplingStock();
  const followMutation = useFollowNursery();
  const unfollowMutation = useUnfollowNursery();
  const [reporting, setReporting] = useState(false);

  const effectiveNurseryId = isOwn ? ownProfile.data?.id : nurseryId;
  const ringStatus = useRingStatus({ nurseryIds: effectiveNurseryId ? [effectiveNurseryId] : [] });
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNurseryPosts(effectiveNurseryId);
  const posts = useMemo(() => postsData?.pages.flatMap((p) => p.posts) ?? [], [postsData]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const openPost = useCallback(
    (post: ApiPost) => {
      if (!effectiveNurseryId) return;
      navigation.navigate('ProfilePostFeed', { authorKind: 'nursery', authorId: effectiveNurseryId, initialPostId: post.id });
    },
    [navigation, effectiveNurseryId],
  );

  const isLoading = isOwn ? !ownProfile.data : !publicProfile.data;
  const achievements = isOwn ? ownAchievements.data ?? [] : publicAchievements.data ?? [];
  const badgesCount = achievements.filter((a) => a.unlocked).length;

  const name = isOwn ? ownProfile.data?.nurseryName ?? 'Your nursery' : publicProfile.data?.nurseryName ?? 'Nursery';
  const logoUrl = resolveMediaUrl(isOwn ? ownProfile.data?.logoUrl : publicProfile.data?.logoUrl);
  const city = isOwn ? ownProfile.data?.city : publicProfile.data?.city;
  const bio = isOwn ? ownProfile.data?.description : publicProfile.data?.description;
  const followStatus = isOwn ? null : publicProfile.data?.followStatus ?? null;
  const isFollowingOrPending = followStatus === 'accepted' || followStatus === 'pending';
  const followersCount = isOwn ? undefined : publicProfile.data?.followersCount ?? 0;

  const toggleFollow = () => {
    if (!nurseryId) return;
    if (isFollowingOrPending) unfollowMutation.mutate(nurseryId);
    else followMutation.mutate(nurseryId);
  };

  const headerBlock = (
    <>
      <ProfileHeader
        avatarUrl={logoUrl}
        avatarEmoji="🌿"
        storyRing={effectiveNurseryId ? ringStatus.data?.nurseries[effectiveNurseryId] : null}
        name={name}
        meta={city ? `📍 ${city}` : null}
        bio={bio}
        stats={
          isOwn
            ? [
                { value: ownStats.data?.speciesCount ?? 0, label: 'Species' },
                { value: ownProfile.data?.streakCurrent ?? 0, label: 'Streak' },
                { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
              ]
            : [
                { value: posts.length, label: 'Posts' },
                {
                  value: followersCount ?? 0,
                  label: 'Followers',
                  onPress: () => effectiveNurseryId && navigation.navigate('PublicFollowers', { kind: 'nursery', id: effectiveNurseryId, name }),
                },
                { value: badgesCount, label: 'Badges', onPress: () => setTab('achievements') },
              ]
        }
        primaryAction={
          isOwn
            ? { label: 'Edit profile', onPress: () => navigation.navigate('EditNurseryProfile'), variant: 'outline' }
            : {
                label: followLabel(followStatus, followersCount ?? 0),
                onPress: toggleFollow,
                busy: followMutation.isPending || unfollowMutation.isPending,
                variant: isFollowingOrPending ? 'outline' : 'solid',
              }
        }
      />

      {!isOwn && (city || publicProfile.data?.contactPhone) && (
        <View style={styles.publicExtras}>
          <LocationActions
            address={city ?? undefined}
            phone={publicProfile.data?.contactPhone}
            hideAddressLine
          />
        </View>
      )}

      <ProfileTabBar activeTab={tab} onChange={setTab} role="nursery" />
    </>
  );

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
          <View style={styles.iconButton} />
        )}
        <Text style={styles.topBarTitle} numberOfLines={1}>{name}</Text>
        {isOwn ? (
          <TouchableOpacity onPress={() => navigation.navigate('EditNurseryProfile')} style={styles.iconButton}>
            <View style={styles.iconBlur}>
              <Text style={styles.iconText}>⚙️</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setReporting(true)} style={styles.iconButton} hitSlop={8}>
              <View style={styles.iconBlur}>
                <Text style={styles.iconText}>🚩</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.iconButton}>
              <View style={styles.iconBlur}>
                <Text style={styles.iconText}>🛒</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : tab === 'drives' ? (
        // Saplings tab gets its own plain ScrollView instead of living inside PostGrid's
        // FlatList — a search input buried in a FlatList's ListHeaderComponent fights with the
        // list's own layout tracking when the keyboard opens (glitchy push-then-dismiss). A
        // ScrollView doesn't have that problem and is the same keyboard-avoidance pattern
        // already used elsewhere in the app (e.g. NgoPortfolioEntryScreen).
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={saplingsScrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {headerBlock}
            <NurserySaplingsTabContent
              isOwn={isOwn}
              stock={isOwn ? ownStock.data ?? [] : publicProfile.data?.stock ?? []}
              isLoading={isOwn ? ownStock.isLoading : false}
              onManageInventory={() => navigation.navigate('NurseryStock')}
              onSearchFocusScroll={(y) => saplingsScrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true })}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
              {headerBlock}
              {tab === 'contributions' && (
                <View style={styles.tabBody}>
                  <BorderCard style={styles.contributionsCard}>
                    <Text style={styles.contributionsTitle}>🌍 Nursery impact</Text>
                    <View style={styles.contributionsRow}>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.speciesCount ?? 0 : '–'}</Text>
                        <Text style={styles.contributionsLabel}>Species listed</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.totalQuantity ?? 0 : '–'}</Text>
                        <Text style={styles.contributionsLabel}>Saplings available</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{followersCount ?? ownProfile.data?.reviewCount ?? 0}</Text>
                        <Text style={styles.contributionsLabel}>{isOwn ? 'Reviews' : 'Followers'}</Text>
                      </View>
                    </View>
                  </BorderCard>
                </View>
              )}
              {tab === 'achievements' && (
                <AchievementsTabContent
                  achievements={achievements}
                  streak={isOwn && ownStreak.data ? { streakCurrent: ownProfile.data?.streakCurrent ?? 0, weeks: ownStreak.data } : undefined}
                />
              )}
            </>
          }
        />
      )}

      <ReportSheet visible={reporting} onClose={() => setReporting(false)} targetType="nursery" targetId={nurseryId ?? null} targetLabel="this nursery" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 10 },
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
  publicExtras: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  contributionsLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
