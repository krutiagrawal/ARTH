import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard, BlurCard } from '../components/common/GlassCard';
import { LocationActions } from '../components/common/LocationActions';
import { EmptyState } from '../components/common/EmptyState';
import { ReportSheet } from '../components/social/ReportSheet';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { PostGrid } from '../components/profile/PostGrid';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { DrivesTabContent } from '../components/profile/DrivesTabContent';
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
} from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import type { ApiPost } from '../api/posts';
import type { ApiSaplingStock } from '../api/nursery';

function followLabel(status: string | null, followersCount: number): string {
  if (status === 'accepted') return 'Following ✓';
  if (status === 'pending') return 'Requested';
  return `Follow · ${followersCount}`;
}

function StockRow({ item, onPress }: { item: ApiSaplingStock; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BlurCard tint="light" noPadding style={styles.stockRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockSpecies}>{item.species}</Text>
          <Text style={styles.stockMeta}>
            {item.quantity} available · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
          </Text>
        </View>
        <Text style={styles.stockChevron}>›</Text>
      </BlurCard>
    </TouchableOpacity>
  );
}

export function NurseryProfileScreen({ route, navigation }: any) {
  const nurseryId: string | undefined = route?.params?.nurseryId;
  const isOwn = !nurseryId;
  const insets = useSafeAreaInsets();

  const ownProfile = useNurseryProfile();
  const ownStats = useNurseryStats();
  const ownStreak = useNurseryStreakCalendar(6);
  const ownAchievements = useNurseryBadges();

  const publicProfile = useNurseryPublicProfile(isOwn ? null : nurseryId ?? null);
  const publicAchievements = useNurseryPublicAchievements(isOwn ? undefined : nurseryId);
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
          <TouchableOpacity onPress={() => navigation.navigate('EditNurseryProfile')} style={styles.iconButton}>
            <BlurView intensity={25} tint="dark" style={styles.iconBlur}>
              <Text style={styles.iconText}>⚙️</Text>
            </BlurView>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setReporting(true)} style={styles.iconButton} hitSlop={8}>
              <BlurView intensity={25} tint="dark" style={styles.iconBlur}>
                <Text style={styles.iconText}>🚩</Text>
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.iconButton}>
              <BlurView intensity={25} tint="dark" style={styles.iconBlur}>
                <Text style={styles.iconText}>🛒</Text>
              </BlurView>
            </TouchableOpacity>
          </View>
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

              {!isOwn && (
                <View style={styles.publicExtras}>
                  <LocationActions
                    label="Location"
                    address={city ?? undefined}
                    phone={publicProfile.data?.contactPhone}
                  />

                  <Text style={styles.sectionTitle}>Available Saplings</Text>
                  {(publicProfile.data?.stock?.length ?? 0) === 0 ? (
                    <EmptyState icon="🌱" title="No stock right now" body="Check back later for available saplings." />
                  ) : (
                    publicProfile.data!.stock.map((item: ApiSaplingStock) => (
                      <StockRow
                        key={item.id}
                        item={item}
                        onPress={() =>
                          navigation.navigate(item.isFree ? 'SaplingReservation' : 'AddToCart', { nurseryId, stockId: item.id })
                        }
                      />
                    ))
                  )}
                </View>
              )}

              <ProfileTabBar activeTab={tab} onChange={setTab} />
              {tab === 'contributions' && (
                <View style={styles.tabBody}>
                  <GlassCard variant="dark" style={styles.contributionsCard}>
                    <Text style={styles.contributionsTitle}>🌍 Nursery impact</Text>
                    <View style={styles.contributionsRow}>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.speciesCount ?? 0 : '—'}</Text>
                        <Text style={styles.contributionsLabel}>Species listed</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{isOwn ? ownStats.data?.totalQuantity ?? 0 : '—'}</Text>
                        <Text style={styles.contributionsLabel}>Saplings available</Text>
                      </View>
                      <View style={styles.contributionsStat}>
                        <Text style={styles.contributionsNum}>{followersCount ?? ownProfile.data?.reviewCount ?? 0}</Text>
                        <Text style={styles.contributionsLabel}>{isOwn ? 'Reviews' : 'Followers'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </View>
              )}
              {tab === 'achievements' && (
                <AchievementsTabContent
                  achievements={achievements}
                  streak={isOwn && ownStreak.data ? { streakCurrent: ownProfile.data?.streakCurrent ?? 0, weeks: ownStreak.data } : undefined}
                />
              )}
              {tab === 'drives' && <DrivesTabContent role="nursery" drives={[]} onPressDrive={() => {}} />}
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
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', gap: 10 },
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
  publicExtras: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12, marginBottom: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  stockSpecies: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  stockMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  stockChevron: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '600' },
  tabBody: { paddingHorizontal: 16, paddingTop: 16 },
  contributionsCard: { gap: 12 },
  contributionsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  contributionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  contributionsStat: { alignItems: 'center' },
  contributionsNum: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  contributionsLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
