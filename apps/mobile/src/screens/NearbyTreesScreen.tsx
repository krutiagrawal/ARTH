import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { EmptyState } from '../components/common/EmptyState';
import { useMyLocation } from '../hooks/useMyLocation';
import { useNearbyTrees } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import { STATUS_META } from '../constants/treeHealth';
import { formatMeters } from '../utils/geo';
import type { ApiNearbyTree } from '../api/trees';

import { TEXT } from '../constants/typography';
const GRID_GAP = 12;

// Flat outlined tile (no fill / glass) — same brown-outline language as My Trees.
function NearbyTreeTile({ tree, closest, onPress }: { tree: ApiNearbyTree; closest: boolean; onPress: () => void }) {
  const health = STATUS_META[tree.healthStatus] ?? STATUS_META.not_checked;
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.photoWrap}>
        {tree.photoUrl ? (
          <Image source={{ uri: resolveMediaUrl(tree.photoUrl) }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>{tree.speciesEmoji ?? '🌳'}</Text>
          </View>
        )}
        <View style={[styles.distanceChip, closest && styles.distanceChipClosest]}>
          <Text style={[styles.distanceText, closest && styles.distanceTextClosest]}>
            {closest ? '📍 ' : ''}{formatMeters(tree.distanceM)}
          </Text>
        </View>
      </View>
      <Text style={styles.species} numberOfLines={1}>
        {tree.speciesEmoji ? `${tree.speciesEmoji} ` : ''}{tree.species}
      </Text>
      <Text style={styles.publicId}>ARTH #{tree.publicId}</Text>
      <View style={[styles.healthPill, { borderColor: health.color }]}>
        <Text style={[styles.healthPillText, { color: health.color }]} numberOfLines={1}>
          {health.emoji} {health.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function NearbyTreesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { coords, loading: locationLoading } = useMyLocation();
  const { data: trees, isLoading } = useNearbyTrees(coords, 800);

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
        <Text style={styles.headerTitle}>Trees Near Me</Text>
        <View style={{ width: 40 }} />
      </View>

      {locationLoading || isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !trees || trees.length === 0 ? (
        <EmptyState icon="🌳" title="No ARTH trees nearby" body="Move around the city and check back — new trees are being planted all the time." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>{trees.length} {trees.length === 1 ? 'tree' : 'trees'} within 800 m</Text>
          <Text style={styles.subtitle}>Tap a tree to open its passport, get directions and send the owner an update.</Text>
          <View style={styles.grid}>
            {trees.map((tree, index) => (
              <NearbyTreeTile
                key={`${tree.kind}-${tree.id}`}
                tree={tree}
                closest={index === 0}
                onPress={() => navigation.navigate('TreePassport', { kind: tree.kind, id: tree.id })}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  count: { ...TEXT.statSmall, fontSize: 22, color: COLORS.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: '48%', flexGrow: 1, padding: 10, gap: 4, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  photoWrap: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 4 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(135,168,120,0.2)' },
  photoEmoji: { fontSize: 44 },
  distanceChip: { position: 'absolute', left: 8, bottom: 8, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)' },
  distanceChipClosest: { backgroundColor: COLORS.forest },
  distanceText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  distanceTextClosest: { color: COLORS.mint },
  species: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  publicId: { fontSize: 11, color: COLORS.textMuted },
  healthPill: { alignSelf: 'flex-start', marginTop: 2, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5 },
  healthPillText: { fontSize: 10, fontWeight: '700' },
});
