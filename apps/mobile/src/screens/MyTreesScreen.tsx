import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { EmptyState } from '../components/common/EmptyState';
import { TreeCard } from '../components/common/TreeCard';
import { useTrees } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { STATUS_META } from '../constants/treeHealth';
import type { TreeHealthStatus } from '../api/plantedTrees';

// Display order for the counts row — healthy first (the reassuring headline number), then
// anything that needs attention, "not checked" last since it's an absence-of-signal state.
const COUNT_ORDER: TreeHealthStatus[] = ['healthy', 'struggling', 'dead', 'removed', 'not_checked'];

export function MyTreesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: trees, isLoading, refetch } = useTrees(200);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const counts = useMemo(() => {
    const tally: Record<TreeHealthStatus, number> = {
      not_checked: 0,
      healthy: 0,
      struggling: 0,
      dead: 0,
      removed: 0,
    };
    for (const tree of trees ?? []) tally[tree.healthStatus] += 1;
    return tally;
  }, [trees]);

  const total = trees?.length ?? 0;

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
        <Text style={styles.headerTitle}>My Trees</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : total === 0 ? (
        <EmptyState icon="🌱" title="No trees yet" body="Every tree you plant will show up here with its own story." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <Text style={styles.totalLine}>{total} {total === 1 ? 'tree' : 'trees'}</Text>
          <View style={styles.countsRow}>
            {COUNT_ORDER.filter((status) => counts[status] > 0).map((status) => (
              <View key={status} style={[styles.countPill, { borderColor: STATUS_META[status].color }]}>
                <Text style={[styles.countPillText, { color: STATUS_META[status].color }]}>
                  {counts[status]} {STATUS_META[status].label}
                </Text>
              </View>
            ))}
          </View>

          {(trees ?? []).map((tree) => (
            <TreeCard
              key={tree.id}
              tree={tree}
              size="card"
              showHealthStatus
              style={styles.treeCard}
              onPress={() => navigation.navigate('TreePassport', { kind: 'tree', id: tree.id })}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  totalLine: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4, marginBottom: 10 },
  countsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  countPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  countPillText: { fontSize: 12, fontWeight: '700' },
  treeCard: { marginBottom: 14 },
});
