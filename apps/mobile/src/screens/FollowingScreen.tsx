import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useFollowedNgos, useFollowedNurseries, useUnfollowNgo, useUnfollowNursery, useFriends, useRemoveFriend } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiFollowedNgo, ApiFollowedNursery } from '../api/follow';
import type { ApiFriend } from '../api/friends';

import { TEXT } from '../constants/typography';
import { useConfirm } from '../context/ConfirmDialogContext';

type ConfirmFn = ReturnType<typeof useConfirm>;

function confirmUnfollow(
  confirm: ConfirmFn,
  name: string,
  onConfirm: () => void,
  copy = { title: 'Unfollow', verb: 'unfollow', suffix: '', action: 'Unfollow' },
) {
  confirm(copy.title, `Are you sure you want to ${copy.verb} ${name}${copy.suffix}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: copy.action, style: 'destructive', onPress: onConfirm },
  ]);
}

function FollowedRow({
  name,
  emoji,
  actionLabel = 'Unfollow',
  logoUrl,
  city,
  followStatus,
  onPress,
  onUnfollow,
  unfollowing,
}: {
  name: string;
  emoji?: string;
  actionLabel?: string;
  logoUrl: string | null;
  city: string | null;
  followStatus: string;
  onPress: () => void;
  onUnfollow: () => void;
  unfollowing: boolean;
}) {
  const metaLine = [city, followStatus === 'pending' ? 'Requested' : null].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        {logoUrl ? (
          <Image source={{ uri: resolveMediaUrl(logoUrl) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{emoji ?? (name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
        </View>
        <TouchableOpacity onPress={onUnfollow} disabled={unfollowing} style={styles.unfollowButton}>
          <Text style={styles.unfollowText}>{unfollowing ? '…' : actionLabel}</Text>
        </TouchableOpacity>
      </BorderCard>
    </TouchableOpacity>
  );
}

type Tab = 'ngos' | 'nurseries' | 'users';
const TABS: { key: Tab; label: string }[] = [
  { key: 'ngos', label: 'NGOs' },
  { key: 'nurseries', label: 'Nurseries' },
  { key: 'users', label: 'Users' },
];

/** Available to every role's account – the NGOs and nurseries I follow, and the users I'm friends with. */
export function FollowingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('ngos');
  const { data: ngos, isLoading: ngosLoading, refetch: refetchNgos } = useFollowedNgos();
  const { data: nurseries, isLoading: nurseriesLoading, refetch: refetchNurseries } = useFollowedNurseries();
  const { data: friends, isLoading: friendsLoading, refetch: refetchFriends } = useFriends();
  const unfollowNgo = useUnfollowNgo();
  const unfollowNursery = useUnfollowNursery();
  const removeFriend = useRemoveFriend();
  const { refreshing, onRefresh } = usePullToRefresh([refetchNgos, refetchNurseries, refetchFriends]);

  const isLoading = ngosLoading || nurseriesLoading || friendsLoading;
  const counts: Record<Tab, number> = {
    ngos: ngos?.length ?? 0,
    nurseries: nurseries?.length ?? 0,
    users: friends?.length ?? 0,
  };
  const empty = {
    ngos: { icon: '🧭', title: 'Not following any NGOs yet', body: 'NGOs you follow will show up here.' },
    nurseries: { icon: '🌿', title: 'Not following any nurseries yet', body: 'Nurseries you follow will show up here.' },
    users: { icon: '🧑‍🤝‍🧑', title: 'No friends yet', body: 'People you are friends with will show up here.' },
  }[tab];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label} ({counts[t.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {counts[tab] === 0 && <EmptyState icon={empty.icon} title={empty.title} body={empty.body} />}
          {tab === 'ngos' &&
            ngos?.map((ngo: ApiFollowedNgo) => (
              <FollowedRow
                key={ngo.id}
                name={ngo.orgName}
                logoUrl={ngo.logoUrl}
                city={ngo.city}
                followStatus={ngo.followStatus}
                onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: ngo.id })}
                onUnfollow={() => confirmUnfollow(confirm, ngo.orgName, () => unfollowNgo.mutate(ngo.id))}
                unfollowing={unfollowNgo.isPending && unfollowNgo.variables === ngo.id}
              />
            ))}
          {tab === 'nurseries' &&
            nurseries?.map((nursery: ApiFollowedNursery) => (
              <FollowedRow
                key={nursery.id}
                name={nursery.nurseryName}
                logoUrl={nursery.logoUrl}
                city={nursery.city}
                followStatus={nursery.followStatus}
                onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: nursery.id })}
                onUnfollow={() => confirmUnfollow(confirm, nursery.nurseryName, () => unfollowNursery.mutate(nursery.id))}
                unfollowing={unfollowNursery.isPending && unfollowNursery.variables === nursery.id}
              />
            ))}
          {tab === 'users' &&
            friends?.map((friend: ApiFriend) => (
              <FollowedRow
                key={friend.id}
                name={friend.name}
                emoji={friend.avatar}
                logoUrl={null}
                city={`@${friend.handle}`}
                followStatus="accepted"
                actionLabel="Remove"
                onPress={() => navigation.navigate('UserPublicProfile', { userId: friend.id })}
                onUnfollow={() =>
                  confirmUnfollow(confirm, friend.name, () => removeFriend.mutate(friend.id), {
                    title: 'Remove friend',
                    verb: 'remove',
                    suffix: ' from your friends',
                    action: 'Remove',
                  })
                }
                unfollowing={removeFriend.isPending && removeFriend.variables === friend.id}
              />
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(107,68,35,0.35)' },
  tabActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: 'rgba(94,133,80,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...TEXT.subheading, color: COLORS.forest },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  unfollowButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(194,74,59,0.1)' },
  unfollowText: { fontSize: 12, fontWeight: '700', color: COLORS.dangerDark },
});
