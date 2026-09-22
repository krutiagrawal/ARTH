import React from 'react';
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
import { usePlantations, useSurvivalStats, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useSlideUp } from '../hooks/useAnimations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { formatDueDate } from '../constants/treeHealth';

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function NgoPlantationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = usePlantations();
  const { data: stats, refetch: refetchStats } = useSurvivalStats();
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchStats, refetchProfile]);

  const plantations = data?.plantations ?? [];

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
        <Text style={styles.headerTitle}>Survival & Impact</Text>
        <TouchableOpacity onPress={guard(() => navigation.navigate('NgoLogPlantedTrees'))} style={styles.addButton}>
          <View style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsBar}>
          <Text style={styles.statsBarText}>
            {stats.total} trees · {stats.survivalRate}% surviving · {stats.counts.not_checked} not checked · {stats.counts.healthy} healthy · {stats.counts.struggling} struggling
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && plantations.length === 0 && (
          <EmptyState icon="🌳" title="No plantations yet" body="Log a batch of planted trees against a drive to start tracking survival by zone." actionLabel="Log trees" onAction={guard(() => navigation.navigate('NgoLogPlantedTrees'))} />
        )}
        {plantations.map((p, i) => (
          <FadeInRow key={p.driveId} delay={Math.min(i, 12) * 40}>
            <TouchableOpacity onPress={() => navigation.navigate('NgoZones', { driveId: p.driveId, driveTitle: p.driveTitle })} activeOpacity={0.85}>
              <BorderCard style={styles.card}>
                <Text style={styles.cardTitle}>{p.driveTitle}</Text>
                <Text style={styles.cardMeta}>
                  {p.zoneCount} zone{p.zoneCount === 1 ? '' : 's'} · {p.total} trees · {p.survivalRate}% survival
                </Text>
                <Text style={styles.cardMeta}>Next health check: {formatDueDate(p.nextCheckDue)}</Text>
              </BorderCard>
            </TouchableOpacity>
          </FadeInRow>
        ))}
      </ScrollView>

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
  addIcon: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  statsBar: { paddingHorizontal: 20, paddingBottom: 10 },
  statsBarText: { fontSize: 11, color: COLORS.textSecondary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
