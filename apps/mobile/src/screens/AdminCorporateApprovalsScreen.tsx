import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
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
import { useAdminCorporates } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import type { NgoApprovalStatus } from '../api/admin';

const FILTERS: { key: NgoApprovalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

const TAKE = 20;

function statusColor(status: string) {
  switch (status) {
    case 'approved':
      return COLORS.sageLight;
    case 'pending':
      return COLORS.amberLight;
    case 'rejected':
    case 'suspended':
      return COLORS.dangerLight;
    default:
      return ON_DARK_SURFACE.primary;
  }
}

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function AdminCorporateApprovalsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const [filter, setFilter] = useState<NgoApprovalStatus | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminCorporates({
    status: filter === 'all' ? undefined : filter,
    q: query.trim() || undefined,
    page,
    take: TAKE,
  });

  const corporates = data?.corporates ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * TAKE < total;

  const onFilterChange = (key: NgoApprovalStatus | 'all') => {
    setFilter(key);
    setPage(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Corporate Approvals</Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => onFilterChange(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company name"
          placeholderTextColor={ON_DARK_SURFACE.muted}
          value={query}
          onChangeText={(v: string) => {
            setQuery(v);
            setPage(1);
          }}
          autoCapitalize="none"
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && corporates.length === 0 && (
          <EmptyState icon="🏬" title="No corporate accounts found" body="No applications match this filter." tint="dark" />
        )}
        {corporates.map((corp, i) => (
          <FadeInRow key={corp.id} delay={i * 60}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AdminCorporateApprovalDetail', { corporate: corp })}
            >
              <GlassCard variant="dark" style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{corp.companyName}</Text>
                  <View style={[styles.statusChip, { borderColor: statusColor(corp.status) }]}>
                    <Text style={[styles.statusChipText, { color: statusColor(corp.status) }]}>{corp.status}</Text>
                  </View>
                </View>
                {corp.owner && (
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {corp.owner.name} · {corp.owner.email}
                  </Text>
                )}
                <Text style={styles.cardBody} numberOfLines={2}>{corp.description}</Text>
              </GlassCard>
            </TouchableOpacity>
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
  filterBar: { paddingHorizontal: 20, marginBottom: 8, gap: 10 },
  chipRow: { gap: 8, paddingRight: 20 },
  chip: { borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: 'rgba(200,230,192,0.18)', borderColor: COLORS.mint },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  chipTextActive: { color: COLORS.mint, fontWeight: '700' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: ON_DARK_SURFACE.primary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardMeta: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 6 },
  cardBody: { fontSize: 13, color: ON_DARK_SURFACE.secondary, marginTop: 6 },
  loadMore: { alignSelf: 'center', marginTop: 8 },
});
