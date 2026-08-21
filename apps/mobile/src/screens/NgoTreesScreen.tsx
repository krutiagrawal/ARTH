import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyAdoptableTrees } from '../hooks/useApiQueries';

export function NgoTreesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: trees = [], isLoading } = useMyAdoptableTrees();

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
        <Text style={styles.headerTitle} numberOfLines={1}>Your Adoptable Trees</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NgoCreateAdoptableTree')} style={styles.addButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.addIcon}>+</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && trees.length === 0 && (
          <EmptyState icon="🌳" title="No trees yet" body="List a tree for the community to adopt." actionLabel="New tree" onAction={() => navigation.navigate('NgoCreateAdoptableTree')} />
        )}
        {trees.map((tree) => (
          <GlassCard key={tree.id} variant="warm" style={styles.card}>
            <Text style={styles.cardTitle}>{tree.nickname}</Text>
            <Text style={styles.cardSubtitle}>{tree.speciesName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                📍 {[tree.location, tree.city].filter(Boolean).join(', ') || 'No location set'}
              </Text>
              <Text style={styles.metaText}>{tree.status}</Text>
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
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
});
