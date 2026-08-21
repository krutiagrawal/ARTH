import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { useNgoPublicProfile, useFollowNgo, useUnfollowNgo } from '../hooks/useApiQueries';

export function NgoPublicProfileScreen({ route, navigation }: any) {
  const ngoId: string = route?.params?.ngoId;
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNgoPublicProfile(ngoId);
  const followMutation = useFollowNgo();
  const unfollowMutation = useUnfollowNgo();

  const toggleFollow = () => {
    if (!profile) return;
    if (profile.isFollowing) unfollowMutation.mutate(ngoId);
    else followMutation.mutate(ngoId);
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>{profile?.orgName ?? 'NGO Profile'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHead}>
            {profile.logoUrl ? (
              <Image source={{ uri: profile.logoUrl }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}><Text style={{ fontSize: 32 }}>🌿</Text></View>
            )}
            <Text style={styles.orgName}>{profile.orgName}</Text>
            {profile.city ? <Text style={styles.city}>📍 {profile.city}{profile.foundedYear ? ` · est. ${profile.foundedYear}` : ''}</Text> : null}

            <TouchableOpacity
              style={[styles.followButton, profile.isFollowing && styles.followingButton]}
              onPress={toggleFollow}
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              <Text style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}>
                {profile.isFollowing ? 'Following ✓' : `Follow · ${profile.followersCount}`}
              </Text>
            </TouchableOpacity>
          </View>

          <GlassCard variant="warm" style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{profile.description}</Text>
            {profile.volunteerCountEstimate ? <Text style={styles.metaLine}>👥 ~{profile.volunteerCountEstimate} volunteers</Text> : null}
            {profile.website ? <Text style={styles.metaLine}>🔗 {profile.website}</Text> : null}
          </GlassCard>

          <View style={styles.statsGrid}>
            <StatDisplay value={String(profile.impact.total)} label="Trees planted" />
            <StatDisplay value={`${profile.impact.survivalRate}%`} label="Survival rate" />
            <StatDisplay value={String(profile.featuredDrives.length)} label="Drives shown" />
          </View>

          {profile.awards.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Awards & recognition</Text>
              {profile.awards.map((a, i) => (
                <Text key={i} style={styles.awardLine}>🏆 {a.title}{a.year ? ` (${a.year})` : ''}{a.issuer ? ` — ${a.issuer}` : ''}</Text>
              ))}
            </GlassCard>
          )}

          {profile.featuredDrives.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Past drives</Text>
              {profile.featuredDrives.map((d) => (
                <Text key={d.id} style={styles.driveLine}>🤝 {d.title} — {new Date(d.startsAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
              ))}
            </GlassCard>
          )}

          {profile.recentUpdates.length > 0 && (
            <GlassCard variant="warm" style={styles.section}>
              <Text style={styles.sectionTitle}>Recent updates</Text>
              {profile.recentUpdates.map((u) => (
                <View key={u.id} style={styles.updateRow}>
                  {u.photoUrl && <Image source={{ uri: u.photoUrl }} style={styles.updatePhoto} />}
                  <View style={{ flex: 1 }}>
                    {u.caption ? <Text style={styles.updateCaption}>{u.caption}</Text> : null}
                    <Text style={styles.updateDate}>{new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  scrollContent: { paddingHorizontal: 20 },
  profileHead: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 10 },
  logoPlaceholder: { width: 88, height: 88, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  orgName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  city: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  followButton: { marginTop: 14, backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 10, paddingHorizontal: 28 },
  followingButton: { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1.5, borderColor: COLORS.sage },
  followButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  followingButtonText: { color: COLORS.forest },
  section: { marginBottom: 12, gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  metaLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  awardLine: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  driveLine: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  updateRow: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  updatePhoto: { width: 52, height: 52, borderRadius: 10 },
  updateCaption: { fontSize: 13, color: COLORS.textPrimary },
  updateDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
