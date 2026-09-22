import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusModal } from '../components/common/StatusModal';
import { usePlantedTrees, useLogBulkHealthChecks, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import type { TreeHealthStatus } from '../api/plantedTrees';
import { useSlideUp } from '../hooks/useAnimations';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { STATUS_META, ACTIONABLE_STATUSES } from '../constants/treeHealth';

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

const STATUS_FILTERS: (TreeHealthStatus | 'all')[] = ['all', 'not_checked', 'healthy', 'struggling', 'dead', 'removed'];

export function NgoZoneTreesScreen({ navigation, route }: any) {
  const { zoneId, zoneName, driveId } = route.params as { zoneId: string | null; zoneName: string; driveId: string };
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = usePlantedTrees({ driveId, zoneId: zoneId ?? 'unzoned', take: 200 });
  const bulkMutation = useLogBulkHealthChecks();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<TreeHealthStatus | 'all'>('all');
  const confirm = useConfirm();
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchProfile]);

  const trees = data?.trees ?? [];
  const filteredTrees = useMemo(
    () => (statusFilter === 'all' ? trees : trees.filter((t) => t.latestStatus === statusFilter)),
    [trees, statusFilter],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyStatus = guard((status: (typeof ACTIONABLE_STATUSES)[number]) => {
    if (selected.size === 0) return;
    confirm(`Mark ${selected.size} tree${selected.size === 1 ? '' : 's'} as ${STATUS_META[status].label.toLowerCase()}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await bulkMutation.mutateAsync({ plantedTreeIds: Array.from(selected), status });
          setSelected(new Set());
        },
      },
    ]);
  });

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
        <Text style={styles.headerTitle} numberOfLines={1}>{zoneName}</Text>
        <View style={styles.addButton} />
      </View>

      {/* Explicit height (not just contentContainerStyle) — a horizontal ScrollView here was
          measuring its own viewport shorter than the pills actually render, silently clipping
          the bottom of every pill at the same boundary regardless of the pills' own padding. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]} numberOfLines={1}>
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (selected.size > 0 ? 100 : 32) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && filteredTrees.length === 0 && (
          <EmptyState icon="🌳" title="No trees match this filter" body="Try a different status filter." />
        )}
        {filteredTrees.map((tree, i) => {
          const meta = STATUS_META[tree.latestStatus];
          const isSelected = selected.has(tree.id);
          return (
            <FadeInRow key={tree.id} delay={Math.min(i, 12) * 40}>
              <TouchableOpacity
                onPress={() => navigation.navigate('NgoTreeDetail', { treeId: tree.id })}
                onLongPress={() => toggle(tree.id)}
                activeOpacity={0.85}
              >
                <BorderCard style={[styles.card, isSelected && styles.cardSelected]}>
                  <View style={styles.cardRow}>
                    <TouchableOpacity onPress={() => toggle(tree.id)} style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{tree.speciesName}{tree.label ? ` – ${tree.label}` : ''}</Text>
                      <Text style={styles.cardMeta}>
                        {tree.locationLabel ? `${tree.locationLabel} · ` : ''}
                        {new Date(tree.plantedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: `${meta.color}22`, borderColor: meta.color }]}>
                      <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
                    </View>
                  </View>
                </BorderCard>
              </TouchableOpacity>
            </FadeInRow>
          );
        })}
      </ScrollView>

      {selected.size > 0 && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.actionBarLabel}>{selected.size} selected – mark as:</Text>
          <View style={styles.actionButtons}>
            {ACTIONABLE_STATUSES.map((status) => (
              <TouchableOpacity key={status} style={[styles.actionButton, { borderColor: STATUS_META[status].color }]} onPress={() => applyStatus(status)}>
                <Text style={[styles.actionButtonText, { color: STATUS_META[status].color }]}>{STATUS_META[status].emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  addButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  filterScroll: { flexGrow: 0, height: 52 },
  filterRow: { alignItems: 'center', paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  // flexShrink: 0 keeps every chip at its own natural content width inside the horizontally
  // scrolling row — without it, two-word labels like "Not Checked" could get squeezed narrower
  // than their siblings and wrap the label onto a second line, which combined with the pill's
  // huge borderRadius turned that one chip into a tall vertical capsule instead of a pill.
  filterChip: { flexShrink: 0, paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  filterChipActive: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  // Explicit lineHeight (rather than leaving it to the font's own metrics) is the fix for
  // descenders on labels like "Healthy"/"Struggling" getting visually clipped at the pill's
  // bottom edge — a bare fontSize gave the text just barely enough box to fit the cap-height,
  // not the 'g'/'y' tails below the baseline.
  filterChipText: { fontSize: 12, lineHeight: 16, color: COLORS.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.white },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 10 },
  cardSelected: { borderColor: COLORS.sage, borderWidth: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  checkmark: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADIUS.full, borderWidth: 1 },
  statusPillText: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.cream, borderTopWidth: 1.5, borderTopColor: COLORS.warmBrown, paddingTop: 12, paddingHorizontal: 20, gap: 8 },
  actionBarLabel: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'transparent' },
  actionButtonText: { fontSize: 18 },
});
