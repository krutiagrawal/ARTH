import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyLocation } from '../hooks/useMyLocation';
import { useNearbyTrees } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import type { ApiNearbyTree } from '../api/trees';
import { formatMeters } from '../utils/geo';

function NearbyTreeRow({ tree, onPress }: { tree: ApiNearbyTree; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={styles.rowInner}>
          {tree.photoUrl ? (
            <Image source={{ uri: resolveMediaUrl(tree.photoUrl) }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={styles.thumbEmoji}>{tree.speciesEmoji ?? '🌳'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.species}>{tree.speciesEmoji ? `${tree.speciesEmoji} ` : ''}{tree.species}</Text>
            <Text style={styles.publicId}>ARTH #{tree.publicId}</Text>
          </View>
          <Text style={styles.distance}>{formatMeters(tree.distanceM)}</Text>
        </View>
      </BorderCard>
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
          <Text style={styles.subtitle}>Tap a tree to open its passport, get directions and send the owner an update.</Text>
          {trees.map((tree) => (
            <NearbyTreeRow
              key={`${tree.kind}-${tree.id}`}
              tree={tree}
              onPress={() => navigation.navigate('TreePassport', { kind: tree.kind, id: tree.id })}
            />
          ))}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  row: { marginBottom: 10 },
  rowInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: RADIUS.md },
  thumbPlaceholder: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.beigeLight, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 22 },
  species: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  publicId: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  distance: { fontSize: 13, fontWeight: '700', color: COLORS.sage },
});
