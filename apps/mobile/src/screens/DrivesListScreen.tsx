import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyLocation } from '../hooks/useMyLocation';
import { useDrives } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';

export function DrivesListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const { coords } = useMyLocation();
  const { data: drives = [], isLoading } = useDrives(coords?.lat, coords?.lng);

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

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && drives.length === 0 && (
          <EmptyState icon="🤝" title="No drives nearby yet" body="Check back soon — NGOs add new planting drives regularly." />
        )}
        {drives.map((drive) => (
          <TouchableOpacity
            key={drive.id}
            activeOpacity={0.85}
            onPress={() => {
              selection();
              navigation.navigate('DriveDetail', { driveId: drive.id });
            }}
          >
            <BorderCard style={styles.card}>
              <Text style={styles.cardTitle}>{drive.title}</Text>
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
});
