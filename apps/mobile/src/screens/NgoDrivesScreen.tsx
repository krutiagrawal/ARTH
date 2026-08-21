import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyDrives } from '../hooks/useApiQueries';

export function NgoDrivesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: drives = [], isLoading } = useMyDrives();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Your Drives</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NgoCreateDrive')} style={styles.addButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && drives.length === 0 && (
          <EmptyState icon="🤝" title="No drives yet" body="Publish your first planting drive to start collecting RSVPs." actionLabel="New drive" onAction={() => navigation.navigate('NgoCreateDrive')} />
        )}
        {drives.map((drive) => (
          <GlassCard key={drive.id} variant="warm" style={styles.card}>
            <Text style={styles.cardTitle}>{drive.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                📍 {[drive.address, drive.city].filter(Boolean).join(', ') || 'No address set'}
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
              <Text style={styles.metaText}>{drive.status}</Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  addButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  addIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
});
