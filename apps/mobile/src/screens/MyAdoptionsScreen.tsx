import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { resolveMediaUrl } from '../api/client';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useHaptics } from '../hooks/useHaptics';
import { useMyAdoptions, useReleaseMyAdoption } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { AdoptionStatusPill } from '../components/adopt/AdoptionStatusPill';
import { AdopterCheckIn } from '../components/adopt/AdopterCheckIn';
import { ReleaseAdoptionModal } from '../components/adopt/ReleaseAdoptionModal';
import { PendingCommunityUpdates } from '../components/adopt/PendingCommunityUpdates';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import type { ApiAdoptableTree } from '../api/adoptions';
import { useConfirm } from '../context/ConfirmDialogContext';

import { TEXT } from '../constants/typography';
function AdoptionRow({ tree, navigation }: { tree: ApiAdoptableTree; navigation: any }) {
  const releaseMutation = useReleaseMyAdoption();
  const [showPending, setShowPending] = useState(false);
  const pendingCount = tree.pendingUpdatesCount ?? 0;
  const { success } = useHaptics();
  const confirm = useConfirm();

  const [releaseOpen, setReleaseOpen] = useState(false);
  const handleRelease = async (reason?: string) => {
    await releaseMutation.mutateAsync({ id: tree.id, reason });
    success();
    setReleaseOpen(false);
  };

  const photo = resolveMediaUrl(tree.photoUri);
  const hasCoords = tree.lat != null && tree.lng != null;

  return (
    <TouchableOpacity onPress={() => navigation.navigate('AdoptTreeDetail', { treeId: tree.id })} activeOpacity={0.85}>
      <BorderCard style={styles.card}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={{ fontSize: 40 }}>🌳</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>{tree.nickname}</Text>
        <Text style={styles.meta}>
          {tree.speciesName} ·{' '}
          <Text
            style={styles.ngoLink}
            onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: tree.ngoId })}
            accessibilityRole="link"
          >
            {tree.ngoName}
          </Text>
        </Text>
        <AdoptionStatusPill status={tree.healthStatus} lastCheckedAt={tree.lastCheckedAt} />
        {!!tree.description && <Text style={styles.description} numberOfLines={2}>{tree.description}</Text>}
        <Text style={styles.location} numberOfLines={1}>
          📍 {[tree.location, tree.city].filter(Boolean).join(', ') || 'Location TBD'}
        </Text>
        {tree.adopter?.adoptedAt && (
          <Text style={styles.since}>Adopted since {new Date(tree.adopter.adoptedAt).toLocaleDateString()}</Text>
        )}
        <View style={styles.statusBlock}>
          <AdopterCheckIn adoptableTreeId={tree.id} />
          {pendingCount > 0 && (
            <TouchableOpacity style={styles.pendingBadge} onPress={() => setShowPending((v) => !v)} accessibilityRole="button">
              <Text style={styles.pendingBadgeText}>
                📬 {pendingCount} {pendingCount === 1 ? 'update' : 'updates'} awaiting your decision {showPending ? '▾' : '▸'}
              </Text>
            </TouchableOpacity>
          )}
          {showPending && <PendingCommunityUpdates adoptableTreeId={tree.id} />}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => navigation.navigate('AdoptTreeDetail', { treeId: tree.id })}
            accessibilityRole="button"
          >
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
          {hasCoords && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.mapBtn]}
              onPress={() => navigation.navigate('NgoMap', { focus: { lat: tree.lat, lng: tree.lng } })}
              accessibilityRole="button"
              accessibilityLabel={`Show ${tree.nickname} on the map`}
            >
              <Text style={styles.mapBtnText}>🗺️ Map</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.releaseButton]}
            onPress={() => setReleaseOpen(true)}
            disabled={releaseMutation.isPending}
            accessibilityRole="button"
          >
            <Text style={styles.releaseText}>{releaseMutation.isPending ? '…' : 'Release'}</Text>
          </TouchableOpacity>
        </View>
      </BorderCard>
      <ReleaseAdoptionModal
        visible={releaseOpen}
        nickname={tree.nickname}
        adoptedAt={tree.adopter?.adoptedAt}
        busy={releaseMutation.isPending}
        onCancel={() => setReleaseOpen(false)}
        onConfirm={handleRelease}
      />
    </TouchableOpacity>
  );
}

export function MyAdoptionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const listQuery = useMyAdoptions();
  const { data: trees, isLoading, refetch } = listQuery;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

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
        <Text style={styles.headerTitle}>My Adopted Trees</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !trees || trees.length === 0 ? (
        <EmptyState icon="🌳" title="No adopted trees yet" body="Trees you adopt from NGOs will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          {...infiniteScrollProps(listQuery)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {trees.map((t) => (
            <AdoptionRow key={t.id} tree={t} navigation={navigation} />
          ))}
          <PageFooter loading={listQuery.isFetchingNextPage} />
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
  card: { marginBottom: 12 },
  cover: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10 },
  coverEmpty: { borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  title: { ...TEXT.subheading, color: COLORS.textPrimary },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  ngoLink: { fontSize: 13, color: COLORS.forest, fontWeight: '700', textDecorationLine: 'underline' },
  description: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  location: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  since: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  statusBlock: { marginTop: 12 },
  pendingBadge: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 1.5, borderColor: COLORS.amber, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  viewBtn: { flex: 1, borderWidth: 2, borderColor: COLORS.warmBrown },
  viewBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  mapBtn: { borderWidth: 1.5, borderColor: COLORS.warmBrown },
  mapBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  releaseButton: { borderWidth: 1.5, borderColor: COLORS.dangerDark },
  releaseText: { fontSize: 13, fontWeight: '700', color: COLORS.dangerDark },
});
