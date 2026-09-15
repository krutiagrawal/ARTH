import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform, RefreshControl } from 'react-native';
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
import { GrowthLevelBadge, GROWTH_LEVEL_META } from '../components/common/GrowthLevelBadge';
import { TrustScoreGauge } from '../components/common/TrustScoreGauge';
import { ContributionStreakCard } from '../components/common/ContributionStreakCard';
import { useNurseryPosts } from '../hooks/useSocialQueries';
import {
  useNurseryProfile,
  useNurseryStats,
  useNurseryReputation,
  useNurseryBadges,
  useNurseryPublicAchievements,
  useNurseryPublicProfile,
  useFollowNursery,
  useUnfollowNursery,
  useRingStatus,
  useSaplingStock,
} from '../hooks/useApiQueries';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../api/client';
import type { ApiPost } from '../api/posts';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function followLabel(status: string | null, followersCount: number): string {
  if (status === 'accepted') return 'Following ✓';
  if (status === 'pending') return 'Requested';
  return `Follow · ${followersCount}`;
}

export function NurseryProfileScreen({ route, navigation }: any) {
  const nurseryId: string | undefined = route?.params?.nurseryId;
  const isOwn = !nurseryId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const saplingsScrollRef = useRef<ScrollView>(null);

  const ownProfile = useNurseryProfile();
  const ownStats = useNurseryStats();
  const ownReputation = useNurseryReputation(8);
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
    refetch: refetchPosts,
  } = useNurseryPosts(effectiveNurseryId);
  const posts = useMemo(() => postsData?.pages.flatMap((p) => p.posts) ?? [], [postsData]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const { refreshing, onRefresh } = usePullToRefresh(
    isOwn
      ? [ownProfile.refetch, ownStats.refetch, ownStock.refetch, refetchPosts]
      : [publicProfile.refetch, refetchPosts],
  );

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
                {
                  value: `${GROWTH_LEVEL_META[ownProfile.data?.growthLevel ?? 'seedling'].emoji} ${GROWTH_LEVEL_META[ownProfile.data?.growthLevel ?? 'seedling'].label}`,
                  label: 'Growth Level',
                  onPress: () => navigation.navigate('NurseryStreakBadges'),
                },
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

      {isOwn && ownProfile.data && (
        <View style={styles.aboutCard}>
          <BorderCard style={styles.aboutCardInner}>
            <Text style={styles.aboutTitle}>About</Text>
            {user?.name && (
              <View style={styles.aboutRow}>
                <Text style={styles.aboutIcon}>👤</Text>
                <Text style={styles.aboutText}>{user.name} · Owner</Text>
              </View>
            )}
            {ownProfile.data.contactPhone && (
              <View style={styles.aboutRow}>
                <Text style={styles.aboutIcon}>📞</Text>
                <Text style={styles.aboutText}>{ownProfile.data.contactPhone}</Text>
              </View>
            )}
            <View style={styles.aboutRow}>
              <Text style={styles.aboutIcon}>⭐</Text>
              <Text style={styles.aboutText}>
                {ownProfile.data.avgRating != null
                  ? `${Number(ownProfile.data.avgRating).toFixed(1)} (${ownProfile.data.reviewCount} review${ownProfile.data.reviewCount === 1 ? '' : 's'})`
                  : 'No reviews yet'}
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutIcon}>🚚</Text>
              <Text style={styles.aboutText}>
                {[ownProfile.data.offersPickup !== false ? 'Pickup' : null, ownProfile.data.offersDelivery ? 'Delivery' : null]
                  .filter(Boolean)
                  .join(' · ') || 'Not currently fulfilling orders'}
              </Text>
            </View>
            {formatMemberSince(ownProfile.data.createdAt) && (
              <View style={styles.aboutRow}>
                <Text style={styles.aboutIcon}>🌱</Text>
                <Text style={styles.aboutText}>On ARTH since {formatMemberSince(ownProfile.data.createdAt)}</Text>
              </View>
            )}
          </BorderCard>
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
          // Settings, not editing — "Edit profile" is the primaryAction button below (matches the
          // individual user's own profile screen: gear icon = Settings, button under the avatar =
          // Edit profile). This icon used to duplicate the button by also opening EditNurseryProfile.
          <TouchableOpacity onPress={() => navigation.navigate('NurserySettings')} style={styles.iconButton}>
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
          <ScrollView
            ref={saplingsScrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
          >
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
          refreshing={refreshing}
          onRefresh={onRefresh}
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
                  customStreak={
                    isOwn && ownReputation.data ? (
                      <View style={{ gap: 12 }}>
                        <BorderCard style={{ gap: 10 }}>
                          <TrustScoreGauge score={ownReputation.data.trustScore} factors={ownReputation.data.trustScoreFactors} variant="light" />
                          <GrowthLevelBadge level={ownReputation.data.growthLevel} variant="light" />
                        </BorderCard>
                        <ContributionStreakCard
                          icon="📦"
                          title="Supply Streak"
                          subtitle="Fulfilled an ARTH order this week"
                          current={ownReputation.data.streaks.supply.current}
                          longest={ownReputation.data.streaks.supply.longest}
                          variant="light"
                        />
                        <ContributionStreakCard
                          icon="🌿"
                          title="Inventory Freshness Streak"
                          subtitle="Kept stock listings up to date"
                          current={ownReputation.data.streaks.inventoryFreshness.current}
                          longest={ownReputation.data.streaks.inventoryFreshness.longest}
                          variant="light"
                        />
                        <ContributionStreakCard
                          icon="🌍"
                          title="ARTH Contribution Streak"
                          subtitle="Any meaningful activity on ARTH"
                          current={ownReputation.data.streaks.arthContribution.current}
                          longest={ownReputation.data.streaks.arthContribution.longest}
                          variant="light"
                        />
                        <ContributionStreakCard
                          icon="🤝"
                          title="Fulfilment Streak"
                          subtitle="Orders fulfilled with no cancellations"
                          current={ownReputation.data.fulfilmentStreak.current}
                          longest={ownReputation.data.fulfilmentStreak.max}
                          unit="orders"
                          variant="light"
                        />
                      </View>
                    ) : undefined
                  }
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
  aboutCard: { paddingHorizontal: 16, marginBottom: 8 },
  aboutCardInner: { gap: 10 },
  aboutTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 0.4 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutIcon: { fontSize: 14, width: 20 },
  aboutText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  contributionsLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
