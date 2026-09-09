import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useNgoPublicFollowers, useNurseryPublicFollowers } from '../hooks/useApiQueries';
import type { ApiPublicFollower } from '../api/publicFollowers';

function FollowerRow({ follower, onPress }: { follower: ApiPublicFollower; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{follower.avatarEmoji}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>{follower.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>@{follower.handle} · {follower.treesPlantedCount} trees planted</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/** Read-only followers list for an NGO or nursery's public profile — reused by both. */
export function PublicFollowersScreen({ navigation, route }: any) {
  const kind: 'ngo' | 'nursery' = route?.params?.kind;
  const id: string = route?.params?.id;
  const name: string = route?.params?.name ?? 'Followers';
  const clearance = useBottomNavClearance();

  const ngoQuery = useNgoPublicFollowers(kind === 'ngo' ? id : undefined);
  const nurseryQuery = useNurseryPublicFollowers(kind === 'nursery' ? id : undefined);
  const { data, isLoading } = kind === 'nursery' ? nurseryQuery : ngoQuery;

  const followers = data?.followers ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title={`${name}'s followers`} subtitle={data ? `${data.total} total` : undefined} onBack={() => navigation.goBack()} />

      {isLoading ? (
        <ActivityIndicator color={COLORS.forest} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(f) => f.id}
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
          renderItem={({ item }) => (
            <FollowerRow follower={item} onPress={() => navigation.navigate('UserPublicProfile', { userId: item.id })} />
          )}
          ListEmptyComponent={
            <EmptyState icon="🌍" title="No followers yet" body="Once people follow, they'll show up here." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: SPACING.md, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.mintLight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 21 },
  rowText: { flex: 1 },
  name: { fontFamily: FONTS.display, fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  chevron: { fontSize: 20, color: COLORS.textMuted, fontWeight: '600' },
});
