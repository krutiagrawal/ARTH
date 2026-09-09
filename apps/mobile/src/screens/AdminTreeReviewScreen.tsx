import React from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAdminTreeReviewQueue, useReviewAdminTree } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';

export function AdminTreeReviewScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const { data, isLoading } = useAdminTreeReviewQueue();
  const reviewMutation = useReviewAdminTree();
  const trees = data?.trees ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Tree Verification</Text>
        <Text style={styles.headerSubtitle}>Submissions the AI flagged or couldn&rsquo;t verify — rejected trees earn no XP until approved here.</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && trees.length === 0 && <EmptyState icon="🌳" title="Queue is empty" body="No submissions waiting for review." tint="dark" />}

        {trees.map((tree) => (
          <BorderCard key={tree.id} style={styles.card}>
            <View style={styles.cardRow}>
              {tree.photoUrl ? (
                <Image source={{ uri: resolveMediaUrl(tree.photoUrl) }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>{tree.species?.emoji || '🌳'}</Text>
                </View>
              )}
              <View style={styles.cardTextColumn}>
                <Text style={styles.cardTitle} numberOfLines={1}>{tree.nickname} · {tree.species?.commonName}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>By {tree.user?.name} (@{tree.user?.handle})</Text>
                <View style={[styles.statusChip, { borderColor: tree.aiVerificationStatus === 'rejected' ? COLORS.dangerLight : COLORS.amberLight }]}>
                  <Text style={[styles.statusChipText, { color: tree.aiVerificationStatus === 'rejected' ? COLORS.dangerLight : COLORS.amberLight }]}>
                    {tree.aiVerificationStatus}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <AnimatedButton
                label="Approve"
                onPress={() => reviewMutation.mutate({ id: tree.id, decision: 'approve' })}
                disabled={reviewMutation.isPending}
                size="sm"
                style={styles.actionButton}
              />
              <AnimatedButton
                label="Reject"
                onPress={() => reviewMutation.mutate({ id: tree.id, decision: 'reject' })}
                variant="secondary"
                disabled={reviewMutation.isPending}
                size="sm"
                style={styles.actionButton}
              />
            </View>
          </BorderCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  headerSubtitle: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 6, lineHeight: 17 },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  photo: { width: 56, height: 56, borderRadius: RADIUS.md },
  photoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  cardTextColumn: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  cardMeta: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 4 },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1 },
});
