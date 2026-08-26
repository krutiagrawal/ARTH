import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { IconBadge } from '../components/common/IconBadge';
import { useMyAdoptableTrees } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const TREE_STATUS_COLORS: Record<'available' | 'adopted' | 'removed', string> = {
  available: COLORS.sage,
  adopted: COLORS.golden,
  removed: COLORS.textMuted,
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

export function NgoTreesScreen({ navigation }: any) {
  const bottomClearance = useBottomNavClearance();
  const { data: trees = [], isLoading } = useMyAdoptableTrees();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && trees.length === 0 && (
          <EmptyState icon="🌳" title="No trees yet" body="List a tree for the community to adopt." actionLabel="New tree" onAction={() => navigation.navigate('NgoCreateAdoptableTree')} />
        )}
        {trees.map((tree, i) => (
          <FadeInRow key={tree.id} delay={i * 60}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                <IconBadge icon="🌳" color={COLORS.forest} size={40} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{tree.nickname}</Text>
                  <Text style={styles.cardSubtitle}>{tree.speciesName}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {[tree.location, tree.city].filter(Boolean).join(', ') || 'No location set'}
                    </Text>
                  </View>
                  <StatusPill
                    label={tree.status.charAt(0).toUpperCase() + tree.status.slice(1)}
                    color={TREE_STATUS_COLORS[tree.status]}
                  />
                </View>
              </View>
            </GlassCard>
          </FadeInRow>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
