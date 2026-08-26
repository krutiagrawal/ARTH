import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { GlassCard } from '../components/common/GlassCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { ReportSheet } from '../components/social/ReportSheet';
import { ActionSheet, type ActionSheetOption } from '../components/social/ActionSheet';
import { useNgoPublicProfile, useFollowNgo, useUnfollowNgo } from '../hooks/useApiQueries';
import { useBlockTarget } from '../hooks/useSocialQueries';
import { resolveMediaUrl } from '../api/client';

/** Follow button copy, driven by `followStatus` so an approval-gated NGO can read "Requested". */
function followLabel(status: string | null, followersCount: number): string {
  if (status === 'accepted') return 'Following ✓';
  if (status === 'pending') return 'Requested';
  return `Follow · ${followersCount}`;
}

export function NgoPublicProfileScreen({ route, navigation }: any) {
  const ngoId: string = route?.params?.ngoId;
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNgoPublicProfile(ngoId);
  const followMutation = useFollowNgo();
  const unfollowMutation = useUnfollowNgo();
  const blockTarget = useBlockTarget();

  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const status = profile?.followStatus ?? null;
  const isFollowingOrPending = status === 'accepted' || status === 'pending';

  const toggleFollow = () => {
    if (!profile) return;
    // A pending request is cancelled by the same tap that would unfollow — same endpoint.
    if (isFollowingOrPending) unfollowMutation.mutate(ngoId);
    else followMutation.mutate(ngoId);
  };

  const menuOptions: ActionSheetOption[] = [
    {
      key: 'report',
      icon: '🚩',
      label: 'Report this organisation',
      onPress: () => setReporting(true),
    },
    {
      key: 'block',
      icon: '🚫',
      label: 'Block',
      hint: 'Hides their posts and stories from you',
      destructive: true,
      onPress: () =>
        blockTarget.mutate({ ngoId }, { onSuccess: () => navigation.goBack() }),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile?.orgName ?? 'NGO Profile'}
        </Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton} hitSlop={8}>
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>

      {isLoading || !profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHead}>
            {profile.logoUrl ? (
              <Image source={{ uri: resolveMediaUrl(profile.logoUrl) }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={{ fontSize: 32 }}>🌿</Text>
              </View>
            )}
            <Text style={styles.orgName}>{profile.orgName}</Text>
            {profile.city ? (
              <Text style={styles.city}>
                📍 {profile.city}
                {profile.foundedYear ? ` · est. ${profile.foundedYear}` : ''}
              </Text>
            ) : null}

            <Text style={styles.followerLine}>
              {profile.followersCount} {profile.followersCount === 1 ? 'follower' : 'followers'}
            </Text>

            <TouchableOpacity
              style={[
                styles.followButton,
                status === 'accepted' && styles.followingButton,
                status === 'pending' && styles.pendingButton,
              ]}
              onPress={toggleFollow}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowingOrPending && styles.followingButtonText,
                ]}
              >
                {followLabel(status, profile.followersCount)}
              </Text>
            </TouchableOpacity>

            {status === 'pending' && (
              <Text style={styles.pendingHint}>
                {profile.orgName} approves each follower. Tap again to cancel your request.
              </Text>
            )}
          </View>

          <GlassCard variant="warm" style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{profile.description}</Text>
            {profile.volunteerCountEstimate ? (
              <Text style={styles.metaLine}>👥 ~{profile.volunteerCountEstimate} volunteers</Text>
            ) : null}
            {profile.website ? <Text style={styles.metaLine}>🔗 {profile.website}</Text> : null}
          </GlassCard>

          <View style={styles.statsGrid}>
            <StatDisplay value={String(profile.impact.total)} label="Trees tracked" />
            <StatDisplay value={`${profile.impact.survivalRate}%`} label="Survival rate" />
            <StatDisplay value={String(profile.followersCount)} label="Followers" />
          </View>

          {/* Kept visually separate from the tracked stats above — these are self-reported and
              have no health checks behind them. */}
          {profile.priorImpact.entries > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Before joining PLANT</Text>
              <Text style={styles.priorLine}>
                {profile.priorImpact.treesPlanted.toLocaleString()} trees ·{' '}
                {profile.priorImpact.volunteersInvolved.toLocaleString()} volunteers across{' '}
                {profile.priorImpact.entries}{' '}
                {profile.priorImpact.entries === 1 ? 'project' : 'projects'}
              </Text>
              <Text style={styles.priorHint}>Self-reported by the organisation.</Text>
            </GlassCard>
          )}

          {profile.portfolio.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Past work</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioRow}>
                {profile.portfolio.map((entry) => {
                  const cover = resolveMediaUrl(entry.media[0]?.url);
                  return (
                    <View key={entry.id} style={styles.portfolioCard}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.portfolioImage} />
                      ) : (
                        <View style={[styles.portfolioImage, styles.portfolioImageEmpty]}>
                          <Text style={{ fontSize: 22, opacity: 0.5 }}>🌱</Text>
                        </View>
                      )}
                      <Text style={styles.portfolioTitle} numberOfLines={2}>
                        {entry.title}
                      </Text>
                      <Text style={styles.portfolioMeta} numberOfLines={1}>
                        {new Date(entry.happenedOn).getFullYear()}
                        {entry.treesPlanted ? ` · ${entry.treesPlanted.toLocaleString()} trees` : ''}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </GlassCard>
          )}

          {profile.staff.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>The team</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
                {profile.staff.map((member) => {
                  const photo = resolveMediaUrl(member.photoUrl);
                  return (
                    <View key={member.id} style={styles.staffCard}>
                      <View style={styles.staffAvatar}>
                        {photo ? (
                          <Image source={{ uri: photo }} style={styles.staffImage} />
                        ) : (
                          <Text style={{ fontSize: 20 }}>🧑‍🌾</Text>
                        )}
                      </View>
                      <Text style={styles.staffName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.staffRole} numberOfLines={1}>
                        {member.role}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </GlassCard>
          )}

          {profile.awards.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Awards & recognition</Text>
              {profile.awards.map((a, i) => (
                <Text key={i} style={styles.awardLine}>
                  🏆 {a.title}
                  {a.year ? ` (${a.year})` : ''}
                  {a.issuer ? ` — ${a.issuer}` : ''}
                </Text>
              ))}
            </GlassCard>
          )}

          {profile.featuredDrives.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Drives on PLANT</Text>
              {profile.featuredDrives.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('DriveDetail', { driveId: d.id })}
                >
                  <Text style={styles.driveLine}>
                    🤝 {d.title} —{' '}
                    {new Date(d.startsAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          )}

          {profile.recentUpdates.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Recent posts</Text>
              <View style={styles.postGrid}>
                {profile.recentUpdates.map((post) => {
                  const cover = resolveMediaUrl(post.media[0]?.url ?? post.photoUrl);
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postTile}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.postImage} />
                      ) : (
                        <View style={[styles.postImage, styles.postImageEmpty]}>
                          <Text style={styles.postTextOnly} numberOfLines={4}>
                            {post.caption}
                          </Text>
                        </View>
                      )}

                      {post.media.length > 1 && (
                        <View style={styles.multiBadge}>
                          <Text style={styles.multiBadgeText}>⧉</Text>
                        </View>
                      )}
                      {post.likeCount > 0 && (
                        <View style={styles.likeBadge}>
                          <Text style={styles.likeBadgeText}>❤️ {post.likeCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          )}
        </ScrollView>
      )}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={profile?.orgName}
        options={menuOptions}
      />
      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        targetType="ngo"
        targetId={ngoId}
        targetLabel="this organisation"
      />
    </View>
  );
}

const TILE = 104;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40 },
  backBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menuDots: { fontSize: 20, color: COLORS.textSecondary },
  scrollContent: { paddingHorizontal: 20 },
  profileHead: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 10 },
  logoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  orgName: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    lineHeight: 32,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  city: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  followerLine: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 6 },
  followButton: {
    marginTop: 12,
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  followingButton: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1.5,
    borderColor: COLORS.sage,
  },
  pendingButton: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1.5,
    borderColor: COLORS.amber,
  },
  followButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  followingButtonText: { color: COLORS.forest },
  pendingHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 260,
  },
  section: { marginBottom: 12, gap: 6 },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  metaLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  priorLine: { fontSize: 14, fontWeight: '700', color: COLORS.forest, lineHeight: 20 },
  priorHint: { fontSize: 11, color: COLORS.textMuted },
  portfolioRow: { gap: 12, paddingRight: 4 },
  portfolioCard: { width: 150 },
  portfolioImage: { width: 150, height: 96, borderRadius: RADIUS.sm, backgroundColor: COLORS.mintLight },
  portfolioImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
    lineHeight: 18,
  },
  portfolioMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  staffRow: { gap: 14, paddingRight: 4 },
  staffCard: { width: 78, alignItems: 'center' },
  staffAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  staffImage: { width: '100%', height: '100%' },
  staffName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 5,
    textAlign: 'center',
  },
  staffRole: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  awardLine: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  driveLine: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  postTile: { width: TILE, height: TILE, borderRadius: RADIUS.sm, overflow: 'hidden' },
  postImage: { width: '100%', height: '100%', backgroundColor: COLORS.mintLight },
  postImageEmpty: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  postTextOnly: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
  multiBadge: { position: 'absolute', top: 5, right: 5 },
  multiBadgeText: { fontSize: 13, color: COLORS.white },
  likeBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  likeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
});
