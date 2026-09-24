import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyLocation } from '../hooks/useMyLocation';
import { useDrives } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export function DrivesListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const queryClient = useQueryClient();
  const { coords } = useMyLocation();
  const { data: drives = [], isLoading, refetch } = useDrives(coords?.lat, coords?.lng);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>NGO Drives</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && drives.length === 0 && (
          <EmptyState icon="🤝" title="No drives nearby yet" body="Check back soon – NGOs add new planting drives regularly." />
        )}
        {drives.map((drive) => (
          <TouchableOpacity
            key={drive.id}
            activeOpacity={0.85}
            onPress={() => {
              selection();
              // Same shape `getDrive` returns (both share `driveInclude`), so the detail screen
              // paints instantly instead of re-fetching data this list screen already has.
              queryClient.setQueryData(['drives', drive.id], drive);
              navigation.navigate('DriveDetail', { driveId: drive.id });
            }}
          >
            <BorderCard style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{drive.title}</Text>
                {drive.isRsvped && (
                  <View style={styles.rsvpBadge}>
                    <Text style={styles.rsvpBadgeText}>Going</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSubtitle}>{drive.ngoName}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText} numberOfLines={1}>
                  📍 {[drive.address, drive.city].filter(Boolean).join(', ') || 'Location TBD'}
                  {drive.distanceKm != null ? ` · ${drive.distanceKm.toFixed(0)} km` : ''}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  📅 {new Date(drive.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.metaText}>
                  👥 {drive.confirmedCount}
                  {drive.capacity != null ? `/${drive.capacity}` : ''} going
                </Text>
              </View>
            </BorderCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  rsvpBadge: { backgroundColor: `${COLORS.sage}22`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  rsvpBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.sageDark },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
});
