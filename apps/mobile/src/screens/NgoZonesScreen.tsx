import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusModal } from '../components/common/StatusModal';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useZonesForDrive, useCreateZone, useBulkMarkZoneHealth, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useSlideUp } from '../hooks/useAnimations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useConfirm } from '../context/ConfirmDialogContext';
import { STATUS_META, ACTIONABLE_STATUSES, formatDueDate } from '../constants/treeHealth';
import type { ApiPlantationZone } from '../api/plantedTrees';

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function ZoneCard({ zone, onOpen, onMark }: { zone: ApiPlantationZone; onOpen: () => void; onMark: (status: (typeof ACTIONABLE_STATUSES)[number]) => void }) {
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85}>
      <BorderCard style={styles.card}>
        <Text style={styles.cardTitle}>{zone.name}</Text>
        <Text style={styles.cardMeta}>
          {zone.total} trees · {zone.counts.healthy}/{zone.counts.struggling}/{zone.counts.dead}/{zone.counts.removed} H/S/D/R
          {zone.counts.not_checked > 0 ? ` · ${zone.counts.not_checked} not checked` : ''}
        </Text>
        <Text style={styles.cardMeta}>
          {zone.survivalRate}% survival · Next check: {formatDueDate(zone.nextCheckDue)}
        </Text>
        {zone.id && zone.total > 0 && (
          <View style={styles.markRow}>
            {ACTIONABLE_STATUSES.map((status) => (
              <TouchableOpacity key={status} style={[styles.markButton, { borderColor: STATUS_META[status].color }]} onPress={() => onMark(status)}>
                <Text style={styles.markButtonText}>{STATUS_META[status].emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BorderCard>
    </TouchableOpacity>
  );
}

export function NgoZonesScreen({ navigation, route }: any) {
  const { driveId, driveTitle } = route.params;
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useZonesForDrive(driveId);
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchProfile]);
  const confirm = useConfirm();
  const createZoneMutation = useCreateZone();
  const bulkMarkMutation = useBulkMarkZoneHealth();

  const [addingZone, setAddingZone] = useState(false);
  const [zoneName, setZoneName] = useState('');

  const zones = data?.zones ?? [];
  const rows = data?.unzoned ? [...zones, data.unzoned] : zones;

  const handleCreateZone = guard(async () => {
    if (!zoneName.trim()) return;
    await createZoneMutation.mutateAsync({ driveId, name: zoneName.trim() });
    setZoneName('');
    setAddingZone(false);
  });

  const handleMark = guard((zoneId: string, zoneNameLabel: string, status: (typeof ACTIONABLE_STATUSES)[number]) => {
    confirm(`Mark ${zoneNameLabel} as ${STATUS_META[status].label.toLowerCase()}?`, 'Every tree currently in this zone gets a new health check.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => bulkMarkMutation.mutateAsync({ zoneId, status }) },
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
        <Text style={styles.headerTitle} numberOfLines={1}>{driveTitle}</Text>
        <TouchableOpacity onPress={guard(() => navigation.navigate('NgoLogPlantedTrees', { driveId, driveTitle }))} style={styles.addButton}>
          <View style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {addingZone ? (
          <View style={styles.newZoneRow}>
            <TextInput
              value={zoneName}
              onChangeText={setZoneName}
              placeholder="e.g. Zone A, Roadside"
              style={styles.newZoneInput}
              autoFocus
            />
            <AnimatedButton label="Add" size="sm" onPress={handleCreateZone} disabled={createZoneMutation.isPending || !zoneName.trim()} />
            <AnimatedButton label="Cancel" size="sm" variant="ghost" onPress={() => { setAddingZone(false); setZoneName(''); }} />
          </View>
        ) : (
          <AnimatedButton label="+ New zone" size="sm" variant="secondary" onPress={guard(() => setAddingZone(true))} style={styles.newZoneButton} />
        )}

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && rows.length === 0 && (
          <EmptyState icon="🌳" title="No trees logged for this plantation" body="Log planted trees, then organize them into zones so health checks stay fast." actionLabel="Log trees" onAction={guard(() => navigation.navigate('NgoLogPlantedTrees', { driveId, driveTitle }))} />
        )}
        {rows.map((zone, i) => (
          <FadeInRow key={zone.id ?? 'unzoned'} delay={Math.min(i, 12) * 40}>
            <ZoneCard
              zone={zone}
              onOpen={() => navigation.navigate('NgoZoneTrees', { zoneId: zone.id, zoneName: zone.name, driveId })}
              onMark={(status) => zone.id && handleMark(zone.id, zone.name, status)}
            />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  loader: { marginTop: 40 },
  newZoneButton: { alignSelf: 'flex-start', marginBottom: 14 },
  newZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  newZoneInput: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  card: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  markRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  markButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADIUS.md, borderWidth: 1.5, backgroundColor: 'transparent' },
  markButtonText: { fontSize: 15 },
});
