import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyCampaigns, useCloseCampaign, useReopenCampaign } from '../hooks/useApiQueries';

export function NgoCampaignsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: campaigns = [], isLoading } = useMyCampaigns();
  const closeMutation = useCloseCampaign();
  const reopenMutation = useReopenCampaign();

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
        <Text style={styles.headerTitle} numberOfLines={1}>Campaigns</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NgoCreateCampaign')} style={styles.addButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && campaigns.length === 0 && (
          <EmptyState icon="💚" title="No campaigns yet" body="Start a donation campaign to fund your next drive." actionLabel="New campaign" onAction={() => navigation.navigate('NgoCreateCampaign')} />
        )}
        {campaigns.map((c) => {
          const progress = c.goalAmountCents ? Math.min(1, c.raisedAmountCents / c.goalAmountCents) : null;
          return (
            <GlassCard key={c.id} variant="warm" style={styles.card}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>{c.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  ₹{(c.raisedAmountCents / 100).toLocaleString()}
                  {c.goalAmountCents ? ` / ₹${(c.goalAmountCents / 100).toLocaleString()}` : ' raised'}
                </Text>
                <Text style={styles.metaText}>{c.status}</Text>
              </View>
              {progress != null && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              )}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => (c.status === 'active' ? closeMutation.mutate(c.id) : reopenMutation.mutate(c.id))}
              >
                <Text style={styles.toggleText}>{c.status === 'active' ? 'Close campaign' : 'Reopen campaign'}</Text>
              </TouchableOpacity>
            </GlassCard>
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
  addButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  addIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 3 },
  toggleButton: { alignSelf: 'flex-start', marginTop: 10 },
  toggleText: { fontSize: 12, color: COLORS.forest, fontWeight: '700' },
});
