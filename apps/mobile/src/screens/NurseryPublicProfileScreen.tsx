import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard, BlurCard } from '../components/common/GlassCard';
import { LocationActions } from '../components/common/LocationActions';
import { EmptyState } from '../components/common/EmptyState';
import { useNurseryPublicProfile } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';
import type { ApiSaplingStock } from '../api/nursery';

function StockRow({ nurseryId, item, onPress }: { nurseryId: string; item: ApiSaplingStock; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BlurCard tint="light" noPadding style={styles.stockRow}>
        <View style={styles.stockText}>
          <Text style={styles.stockSpecies}>{item.species}</Text>
          <Text style={styles.stockMeta}>
            {item.quantity} available · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
          </Text>
        </View>
        <Text style={styles.stockChevron}>›</Text>
      </BlurCard>
    </TouchableOpacity>
  );
}

export function NurseryPublicProfileScreen({ route, navigation }: any) {
  const nurseryId: string = route?.params?.nurseryId;
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNurseryPublicProfile(nurseryId);

  const handleCall = () => {
    if (profile?.contactPhone) Linking.openURL(`tel:${profile.contactPhone}`);
  };

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
        <Text style={styles.headerTitle} numberOfLines={1}>{profile?.nurseryName ?? 'Nursery'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <GlassCard variant="warm" style={styles.card}>
            <View style={styles.cardRow}>
              {profile.logoUrl ? (
                <Image source={{ uri: resolveMediaUrl(profile.logoUrl) }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}><Text style={{ fontSize: 24 }}>🌿</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{profile.nurseryName}</Text>
                {profile.city ? <Text style={styles.cityText}>📍 {profile.city}</Text> : null}
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.description}>{profile.description}</Text>
          </GlassCard>

          <LocationActions label="Location" address={profile.city ?? undefined} />

          {profile.contactPhone && (
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Text style={styles.callButtonText}>📞 Call {profile.contactPhone}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Available Saplings</Text>
          {profile.stock.length === 0 ? (
            <EmptyState icon="🌱" title="No stock right now" body="Check back later for available saplings." />
          ) : (
            profile.stock.map((item) => (
              <StockRow
                key={item.id}
                nurseryId={nurseryId}
                item={item}
                onPress={() => navigation.navigate('SaplingReservation', { nurseryId, stockId: item.id })}
              />
            ))
          )}
        </ScrollView>
      )}
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
  card: { marginBottom: 16 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: 14 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  cityText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary },
  callButton: { marginTop: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: 'rgba(94,133,80,0.1)', alignItems: 'center' },
  callButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 20, marginBottom: 8 },
  stockRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  stockText: { flex: 1 },
  stockSpecies: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  stockMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  stockChevron: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '600' },
});
