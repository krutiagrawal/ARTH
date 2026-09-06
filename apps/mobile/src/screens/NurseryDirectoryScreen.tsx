import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useBrowseNurseries } from '../hooks/useApiQueries';
import { useMyLocation } from '../hooks/useMyLocation';
import { resolveMediaUrl } from '../api/client';

export function NurseryDirectoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const { coords } = useMyLocation();
  const { data, isLoading } = useBrowseNurseries({
    q: query || undefined,
    deliveryOnly: deliveryOnly || undefined,
    lat: nearbyOnly ? coords?.lat : undefined,
    lng: nearbyOnly ? coords?.lng : undefined,
  });
  const nurseries = data?.nurseries ?? [];

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
        <Text style={styles.headerTitle}>Nurseries</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search nurseries by name or city"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity onPress={() => setDeliveryOnly((v) => !v)} style={[styles.filterChip, deliveryOnly && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, deliveryOnly && styles.filterChipTextActive]}>🚚 Delivers</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setNearbyOnly((v) => !v)} style={[styles.filterChip, nearbyOnly && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, nearbyOnly && styles.filterChipTextActive]}>📍 Nearby</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && nurseries.length === 0 && (
          <EmptyState icon="🌱" title="No nurseries found" body="Try a different search term." />
        )}
        {nurseries.map((nursery) => (
          <TouchableOpacity key={nursery.id} onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: nursery.id })} activeOpacity={0.85}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                {nursery.logoUrl ? (
                  <Image source={{ uri: resolveMediaUrl(nursery.logoUrl) }} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder}><Text style={{ fontSize: 20 }}>🌿</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{nursery.nurseryName}</Text>
                  <View style={styles.badgeRow}>
                    {nursery.city ? <Text style={styles.cardMeta}>📍 {nursery.city}</Text> : null}
                    {nursery.distanceKm != null && (
                      <Text style={styles.cardMeta}>{nursery.distanceKm.toFixed(1)} km away</Text>
                    )}
                    {nursery.reviewCount > 0 && (
                      <Text style={styles.cardMeta}>★ {Number(nursery.avgRating).toFixed(1)} ({nursery.reviewCount})</Text>
                    )}
                    {nursery.offersDelivery && <Text style={styles.cardMeta}>🚚 Delivers</Text>}
                  </View>
                  <Text style={styles.cardBody} numberOfLines={2}>{nursery.description}</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sand, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  filterChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sand, backgroundColor: 'rgba(255,255,255,0.8)' },
  filterChipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 2, flexWrap: 'wrap' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 12 },
  logoPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
