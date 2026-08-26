import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS } from '../constants/theme';
import { LeafBranch } from '../components/common/LeafBranch';
import { NotificationBell } from '../components/social/NotificationBell';
import { NgoOwnPostsScreen } from './NgoOwnPostsScreen';
import { NgoFollowersScreen } from './NgoFollowersScreen';
import { NgoFollowerRequestsScreen } from './NgoFollowerRequestsScreen';
import { useNgoFollowers } from '../hooks/useSocialQueries';

type Segment = 'posts' | 'followers' | 'requests';

const SEGMENTS: { key: Segment; label: string; subtitle: string }[] = [
  { key: 'posts', label: 'Posts', subtitle: 'What you have shared with your supporters' },
  { key: 'followers', label: 'Followers', subtitle: 'People who see your updates in their feed' },
  { key: 'requests', label: 'Requests', subtitle: 'People waiting for you to accept them' },
];

/**
 * The NGO's social home: what it has posted, who follows it, and who is waiting to.
 *
 * Segmented in the same shape as NgoManageScreen so the two tabs feel like siblings. The counts
 * come from one shared followers query, which React Query dedupes across the segments.
 */
export function NgoCommunityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('posts');
  const active = SEGMENTS.find((s) => s.key === segment)!;

  // Cheap: the same query the Followers segment uses, so this costs nothing extra.
  const { data: followerData } = useNgoFollowers({ status: 'accepted' });
  const pendingCount = followerData?.pendingCount ?? 0;
  const followerCount = followerData?.total ?? 0;

  const badgeFor = (key: Segment) => {
    if (key === 'requests' && pendingCount > 0) return pendingCount;
    if (key === 'followers' && followerCount > 0) return followerCount;
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <LeafBranch size={160} style={styles.leaf} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerTitleAccent}>Your </Text>
              community
            </Text>
            <Text style={styles.headerSubtitle}>{active.subtitle}</Text>
          </View>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
        </View>
      </View>

      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => {
          const badge = badgeFor(s.key);
          const isActive = segment === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => setSegment(s.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{s.label}</Text>
              {badge !== null && (
                <View
                  style={[
                    styles.badge,
                    isActive && styles.badgeActive,
                    // Pending requests are an action item, not a stat — they get the alert colour.
                    s.key === 'requests' && styles.badgeAlert,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isActive && styles.badgeTextActive,
                      s.key === 'requests' && styles.badgeTextAlert,
                    ]}
                  >
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.body}>
        {segment === 'posts' && <NgoOwnPostsScreen navigation={navigation} />}
        {segment === 'followers' && <NgoFollowersScreen />}
        {segment === 'requests' && <NgoFollowerRequestsScreen navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  leaf: { top: 28, right: -20 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: FONTS.displayBold, fontSize: 28, lineHeight: 37, color: COLORS.textPrimary },
  // The family has to be repeated on the nested span — AppText resolves each <Text> on its own,
  // so a child that only sets a colour drops back to the body face mid-word.
  headerTitleAccent: { fontFamily: FONTS.displayBold, color: COLORS.forest },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  segmentRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 9,
    backgroundColor: COLORS.beigeLight,
    borderWidth: 1.5,
    borderColor: COLORS.sand,
  },
  segmentActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.white },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeAlert: { backgroundColor: COLORS.danger },
  badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.textSecondary },
  badgeTextActive: { color: COLORS.white },
  badgeTextAlert: { color: COLORS.white },
  body: { flex: 1 },
});
