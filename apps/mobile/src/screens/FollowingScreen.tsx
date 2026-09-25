import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useFollowedNgos, useFollowedNurseries, useUnfollowNgo, useUnfollowNursery } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiFollowedNgo, ApiFollowedNursery } from '../api/follow';

function FollowedRow({
  id,
  name,
  logoUrl,
  city,
  followStatus,
  onPress,
  onUnfollow,
  unfollowing,
}: {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  followStatus: string;
  onPress: () => void;
  onUnfollow: () => void;
  unfollowing: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        {logoUrl ? (
          <Image source={{ uri: resolveMediaUrl(logoUrl) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.meta}>{city ?? '—'}{followStatus === 'pending' ? ' · Requested' : ''}</Text>
        </View>
        <TouchableOpacity onPress={onUnfollow} disabled={unfollowing} style={styles.unfollowButton}>
          <Text style={styles.unfollowText}>{unfollowing ? '…' : 'Unfollow'}</Text>
        </TouchableOpacity>
      </BorderCard>
    </TouchableOpacity>
  );
}

/** Available to every role's account — the NGOs and nurseries I follow. */
export function FollowingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: ngos, isLoading: ngosLoading, refetch: refetchNgos } = useFollowedNgos();
  const { data: nurseries, isLoading: nurseriesLoading, refetch: refetchNurseries } = useFollowedNurseries();
  const unfollowNgo = useUnfollowNgo();
  const unfollowNursery = useUnfollowNursery();
  const { refreshing, onRefresh } = usePullToRefresh([refetchNgos, refetchNurseries]);

  const isLoading = ngosLoading || nurseriesLoading;
  const isEmpty = (ngos?.length ?? 0) === 0 && (nurseries?.length ?? 0) === 0;

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

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : isEmpty ? (
        <EmptyState icon="🧭" title="Not following anyone yet" body="NGOs and nurseries you follow will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {(ngos?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionLabel}>NGOs</Text>
              {ngos!.map((ngo: ApiFollowedNgo) => (
                <FollowedRow
                  key={ngo.id}
                  id={ngo.id}
                  name={ngo.orgName}
                  logoUrl={ngo.logoUrl}
                  city={ngo.city}
                  followStatus={ngo.followStatus}
                  onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: ngo.id })}
                  onUnfollow={() => unfollowNgo.mutate(ngo.id)}
                  unfollowing={unfollowNgo.isPending && unfollowNgo.variables === ngo.id}
                />
              ))}
            </>
          )}
          {(nurseries?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionLabel}>Nurseries</Text>
              {nurseries!.map((nursery: ApiFollowedNursery) => (
                <FollowedRow
                  key={nursery.id}
                  id={nursery.id}
                  name={nursery.nurseryName}
                  logoUrl={nursery.logoUrl}
                  city={nursery.city}
                  followStatus={nursery.followStatus}
                  onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: nursery.id })}
                  onUnfollow={() => unfollowNursery.mutate(nursery.id)}
                  unfollowing={unfollowNursery.isPending && unfollowNursery.variables === nursery.id}
                />
              ))}
            </>
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: 'rgba(94,133,80,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  unfollowButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(194,74,59,0.1)' },
  unfollowText: { fontSize: 12, fontWeight: '700', color: COLORS.dangerDark },
});
