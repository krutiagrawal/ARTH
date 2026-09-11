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
import { useAdoptableTrees } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';

export function AdoptTreeListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const { coords } = useMyLocation();
  const { data: trees = [], isLoading } = useAdoptableTrees(coords?.lat, coords?.lng);

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
        <Text style={styles.headerTitle} numberOfLines={1}>Adopt a Tree</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && trees.length === 0 && (
          <EmptyState icon="🌳" title="No trees available to adopt yet" body="NGOs list trees near you as they become available." />
        )}
        {trees.map((tree) => (
          <TouchableOpacity
            key={tree.id}
            activeOpacity={0.85}
            onPress={() => {
              selection();
              navigation.navigate('AdoptTreeDetail', { treeId: tree.id });
            }}
          >
            <BorderCard style={styles.card}>
              <Text style={styles.cardTitle}>{tree.nickname}</Text>
              <Text style={styles.cardSubtitle}>{tree.speciesName} · {tree.ngoName}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText} numberOfLines={1}>
                  📍 {[tree.location, tree.city].filter(Boolean).join(', ') || 'Location TBD'}
                  {tree.distanceKm != null ? ` · ${tree.distanceKm.toFixed(0)} km` : ''}
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
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
});
