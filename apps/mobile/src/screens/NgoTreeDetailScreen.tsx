import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { usePlantedTree, useHealthCheckHistory, useLogHealthCheck, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { resolveMediaUrl } from '../api/client';
import { STATUS_META, ACTIONABLE_STATUSES } from '../constants/treeHealth';

export function NgoTreeDetailScreen({ navigation, route }: any) {
  const { treeId } = route.params as { treeId: string };
  const insets = useSafeAreaInsets();
  const { data: tree, isLoading } = usePlantedTree(treeId);
  const { data: history } = useHealthCheckHistory(treeId);
  const logMutation = useLogHealthCheck();
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);

  const checks = history?.checks ?? [];

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
        <Text style={styles.headerTitle} numberOfLines={1}>{tree?.speciesName ?? 'Tree'}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading || !tree ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {tree.photoUrl && (
            <Image source={{ uri: resolveMediaUrl(tree.photoUrl) }} style={styles.photo} resizeMode="cover" />
          )}

          <BorderCard style={styles.infoCard}>
            <Text style={styles.cardSubtitle}>{tree.zoneName ? `${tree.zoneName} · ` : ''}{tree.driveTitle || 'No plantation'}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusPill, { backgroundColor: `${STATUS_META[tree.latestStatus].color}22`, borderColor: STATUS_META[tree.latestStatus].color }]}>
                <Text style={[styles.statusPillText, { color: STATUS_META[tree.latestStatus].color }]}>
                  {STATUS_META[tree.latestStatus].emoji} {STATUS_META[tree.latestStatus].label}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Planted</Text>
              <Text style={styles.infoValue}>{new Date(tree.plantedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            {tree.locationLabel && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{tree.locationLabel}</Text>
              </View>
            )}
            {tree.lat != null && tree.lng != null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>GPS</Text>
                <Text style={styles.infoValue}>{tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}</Text>
              </View>
            )}
          </BorderCard>

          <Text style={styles.sectionLabel}>Mark this tree as</Text>
          <View style={styles.markRow}>
            {ACTIONABLE_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.markButton, { borderColor: STATUS_META[status].color }]}
                disabled={logMutation.isPending}
                onPress={guard(() => logMutation.mutateAsync({ plantedTreeId: treeId, status }))}
              >
                <Text style={styles.markButtonText}>{STATUS_META[status].emoji} {STATUS_META[status].label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Health-check history</Text>
          {checks.length === 0 ? (
            <Text style={styles.emptyHistory}>No health checks logged yet.</Text>
          ) : (
            checks.map((check) => (
              <BorderCard key={check.id} style={styles.historyRow} noPadding>
                <View style={styles.historyRowInner}>
                  <View style={[styles.statusPill, { backgroundColor: `${STATUS_META[check.status].color}22`, borderColor: STATUS_META[check.status].color }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_META[check.status].color }]}>
                      {STATUS_META[check.status].emoji} {STATUS_META[check.status].label}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>{new Date(check.checkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
              </BorderCard>
            ))
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
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  photo: { width: '100%', height: 180, borderRadius: RADIUS.lg, marginBottom: 14 },
  infoCard: { marginBottom: 18 },
  cardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADIUS.full, borderWidth: 1 },
  statusPillText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  markRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  markButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full, borderWidth: 1.5, backgroundColor: 'transparent' },
  markButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  emptyHistory: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 18 },
  historyRow: { marginBottom: 8 },
  historyRowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  historyDate: { fontSize: 11, color: COLORS.textSecondary },
});
