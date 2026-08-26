import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAdminActionLogs } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';

const TAKE = 25;

function actionLabel(action: string) {
  return action.replace(/^ngo\./, '').replace(/_/g, ' ');
}

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function AdminAuditLogScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminActionLogs({ page, take: TAKE });
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * TAKE < total;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Audit Log</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && page === 1 && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && logs.length === 0 && (
          <EmptyState icon="📜" title="No actions yet" body="Admin actions will show up here as they happen." tint="dark" />
        )}
        {logs.map((log, i) => (
          <FadeInRow key={log.id} delay={i * 50}>
            <GlassCard variant="dark" style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.action}>{actionLabel(log.action)}</Text>
                <Text style={styles.timestamp}>{new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={styles.target}>{log.targetType} · {log.targetId}</Text>
              <Text style={styles.actor}>by {log.actor.name} (@{log.actor.handle})</Text>
              {log.reason && <Text style={styles.reason}>"{log.reason}"</Text>}
            </GlassCard>
          </FadeInRow>
        ))}

        {hasMore && !isLoading && (
          <AnimatedButton
            label="Load more"
            onPress={() => setPage((p) => p + 1)}
            variant="secondary"
            size="sm"
            style={styles.loadMore}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  action: { fontSize: 15, fontWeight: '700', color: ON_DARK_SURFACE.primary, textTransform: 'capitalize' },
  timestamp: { fontSize: 11, color: ON_DARK_SURFACE.muted },
  target: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 4 },
  actor: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 2 },
  reason: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 6, fontStyle: 'italic' },
  loadMore: { alignSelf: 'center', marginTop: 8 },
});
