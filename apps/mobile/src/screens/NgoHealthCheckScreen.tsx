import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { usePlantedTrees, useSurvivalStats, useLogBulkHealthChecks } from '../hooks/useApiQueries';
import type { TreeHealthStatus } from '../api/plantedTrees';
import { useSlideUp } from '../hooks/useAnimations';
import { useConfirm } from '../context/ConfirmDialogContext';

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

const STATUS_META: Record<TreeHealthStatus, { emoji: string; color: string; label: string }> = {
  healthy: { emoji: '🌱', color: COLORS.sage, label: 'Healthy' },
  struggling: { emoji: '🥀', color: COLORS.amber, label: 'Struggling' },
  dead: { emoji: '💀', color: COLORS.danger, label: 'Dead' },
  removed: { emoji: '🚫', color: COLORS.textMuted, label: 'Removed' },
};

export function NgoHealthCheckScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = usePlantedTrees({ take: 200 });
  const { data: stats } = useSurvivalStats();
  const bulkMutation = useLogBulkHealthChecks();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const confirm = useConfirm();

  const trees = data?.trees ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyStatus = (status: TreeHealthStatus) => {
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
  };

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
        <Text style={styles.headerTitle}>Health Checks</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NgoLogPlantedTrees')} style={styles.addButton}>
          <View style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsBar}>
          <Text style={styles.statsBarText}>
            {stats.total} trees · {stats.survivalRate}% surviving · {stats.counts.healthy} healthy · {stats.counts.struggling} struggling · {stats.counts.dead} dead
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: (selected.size > 0 ? 100 : 32) + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && trees.length === 0 && (
          <EmptyState icon="🌳" title="No planted trees logged" body="Log a batch of planted trees to start tracking survival." actionLabel="Log trees" onAction={() => navigation.navigate('NgoLogPlantedTrees')} />
        )}
        {trees.map((tree, i) => {
          const meta = STATUS_META[tree.latestStatus];
          const isSelected = selected.has(tree.id);
          return (
            <FadeInRow key={tree.id} delay={Math.min(i, 12) * 40}>
              <TouchableOpacity onPress={() => toggle(tree.id)} activeOpacity={0.85}>
                <BorderCard style={[styles.card, isSelected && styles.cardSelected]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{tree.speciesName}{tree.label ? ` – ${tree.label}` : ''}</Text>
                      <Text style={styles.cardMeta}>
                        {tree.driveTitle ? `${tree.driveTitle} · ` : ''}
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
            {(Object.keys(STATUS_META) as TreeHealthStatus[]).map((status) => (
              <TouchableOpacity key={status} style={[styles.actionButton, { borderColor: STATUS_META[status].color }]} onPress={() => applyStatus(status)}>
                <Text style={[styles.actionButtonText, { color: STATUS_META[status].color }]}>{STATUS_META[status].emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  addButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  addIcon: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  statsBar: { paddingHorizontal: 20, paddingBottom: 10 },
  statsBarText: { fontSize: 11, color: COLORS.textSecondary },
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
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS.full, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.cream, borderTopWidth: 1.5, borderTopColor: COLORS.warmBrown, paddingTop: 12, paddingHorizontal: 20, gap: 8 },
  actionBarLabel: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'transparent' },
  actionButtonText: { fontSize: 18 },
});
