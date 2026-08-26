import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useCampaigns } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function CampaignsListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const { data: campaigns = [], isLoading } = useCampaigns();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Donate to an NGO</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && campaigns.length === 0 && (
          <EmptyState icon="💚" title="No active campaigns yet" body="Verified NGOs will list donation campaigns here." />
        )}
        {campaigns.map((c) => {
          const progress = c.goalAmountCents ? Math.min(1, c.raisedAmountCents / c.goalAmountCents) : null;
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onPress={() => {
                selection();
                navigation.navigate('CampaignDetail', { campaignId: c.id });
              }}
            >
              <GlassCard variant="warm" style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSubtitle}>{c.ngoName}</Text>
                <Text style={styles.raisedText}>
                  {formatRupees(c.raisedAmountCents)}{c.goalAmountCents ? ` raised of ${formatRupees(c.goalAmountCents)}` : ' raised'}
                </Text>
                {progress != null && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  raisedText: { fontSize: 13, color: COLORS.forest, fontWeight: '600', marginTop: 10 },
  progressTrack: { height: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(94,133,80,0.15)', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: RADIUS.full },
});
