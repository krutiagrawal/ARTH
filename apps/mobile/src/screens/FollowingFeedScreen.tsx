import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useFollowingFeed } from '../hooks/useApiQueries';

export function FollowingFeedScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useFollowingFeed();
  const updates = data?.updates ?? [];

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
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && updates.length === 0 && (
          <EmptyState icon="🌿" title="No updates yet" body="Follow NGOs to see their real-time updates here." actionLabel="Browse NGOs" onAction={() => navigation.navigate('NgoDirectory')} />
        )}
        {updates.map((u) => (
          <GlassCard key={u.id} variant="warm" style={styles.card}>
            <View style={styles.cardHeaderRow}>
              {u.ngoLogoUrl ? (
                <Image source={{ uri: u.ngoLogoUrl }} style={styles.ngoLogo} />
              ) : (
                <View style={styles.ngoLogoPlaceholder}><Text style={{ fontSize: 14 }}>🌿</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.ngoName}>{u.ngoName}</Text>
                <Text style={styles.date}>{new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{u.driveTitle ? ` · ${u.driveTitle}` : ''}</Text>
              </View>
            </View>
            {u.photoUrl && <Image source={{ uri: u.photoUrl }} style={styles.photo} />}
            {u.caption ? <Text style={styles.caption}>{u.caption}</Text> : null}
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
  loader: { marginTop: 40 },
  card: { marginBottom: 14, gap: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ngoLogo: { width: 32, height: 32, borderRadius: 8 },
  ngoLogoPlaceholder: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  ngoName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  caption: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
});
