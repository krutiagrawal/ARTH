import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNgoVolunteers } from '../hooks/useApiQueries';

export function NgoVolunteersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: volunteers = [], isLoading } = useNgoVolunteers();

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
        <Text style={styles.headerTitle}>Volunteers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>People who've RSVP'd to your drives — attendance count and last activity.</Text>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && volunteers.length === 0 && (
          <EmptyState icon="👥" title="No volunteers yet" body="Once people RSVP to your drives, they'll show up here." />
        )}
        {volunteers.map((v) => (
          <GlassCard key={v.userId} variant="warm" style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{v.name}</Text>
                <Text style={styles.cardMeta}>@{v.handle}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.countText}>{v.drivesAttended} drive{v.drivesAttended === 1 ? '' : 's'}</Text>
                {v.lastActiveAt && (
                  <Text style={styles.dateText}>{new Date(v.lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                )}
              </View>
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  countText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
