import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNurseryBulkRequirementsCombined } from '../hooks/useApiQueries';
import type { ApiBulkRequirement } from '../api/nursery';

type FilterTab = 'open' | 'responded' | 'accepted' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'responded', label: 'Responded' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'completed', label: 'Completed' },
];

/** "Responded"/"Accepted"/"Completed" aren't BulkRequirement.status values on their own — they're
 * derived from a combination of the requirement's status and this nursery's own response status,
 * per the product spec's simplified filter set. */
function matchesTab(req: ApiBulkRequirement, tab: FilterTab): boolean {
  const responseStatus = req.myResponse?.status;
  switch (tab) {
    case 'open':
      return req.status === 'open' && !responseStatus;
    case 'responded':
      return responseStatus === 'proposed';
    case 'accepted':
      return responseStatus === 'accepted';
    case 'completed':
      return responseStatus === 'fulfilled' || req.status === 'fulfilled';
    default:
      return true;
  }
}

function RequirementRow({ item, navigation }: { item: ApiBulkRequirement; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('NurseryBulkRequirementDetail', { requirementId: item.id })} activeOpacity={0.85}>
      <BorderCard style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ngoName}>{item.ngo.orgName}</Text>
          <Text style={styles.species}>
            {item.species?.commonName ?? item.speciesNote ?? 'Any species'}
            {item.nativePreferred ? ' · Native preferred' : ''}
          </Text>
          <Text style={styles.meta}>
            {item.quantityFulfilled}/{item.quantityNeeded} fulfilled
            {item.neededByDate ? ` · Needed by ${new Date(item.neededByDate).toLocaleDateString()}` : ''}
            {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ''}
          </Text>
          {item.myResponse && (
            <View style={[styles.statusBadge, badgeColor(item.myResponse.status)]}>
              <Text style={styles.statusBadgeText}>{item.myResponse.status}</Text>
            </View>
          )}
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

function badgeColor(status: string) {
  if (status === 'accepted' || status === 'fulfilled') return { backgroundColor: 'rgba(94,133,80,0.15)' };
  if (status === 'declined' || status === 'withdrawn') return { backgroundColor: 'rgba(194,74,59,0.12)' };
  return { backgroundColor: 'rgba(212,168,83,0.18)' };
}

export function NurseryBulkRequirementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FilterTab>('open');
  const { data: requirements = [], isLoading } = useNurseryBulkRequirementsCombined();

  const filtered = useMemo(() => requirements.filter((r) => matchesTab(r, tab)), [requirements, tab]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Bulk Requirements" subtitle="NGO drives looking for saplings" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🤝" title="Nothing here" body="Requirements in this stage will show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {filtered.map((r) => (
            <RequirementRow key={r.id} item={r} navigation={navigation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { paddingHorizontal: SPACING.md, gap: 8, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  tabActive: { backgroundColor: COLORS.forest },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  list: { paddingHorizontal: SPACING.md },
  row: { marginBottom: 10 },
  ngoName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  species: { fontSize: 13, color: COLORS.textPrimary, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
});
