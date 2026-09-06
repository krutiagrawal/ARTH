import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BlurCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useWishlist, useRemoveWishlistItem } from '../hooks/useApiQueries';
import type { ApiWishlistItem } from '../api/wishlist';

function WishlistRow({ item, navigation }: { item: ApiWishlistItem; navigation: any }) {
  const removeMutation = useRemoveWishlistItem();

  const title = item.nursery?.nurseryName ?? item.stock?.species ?? 'Item';
  const subtitle = item.nursery
    ? 'Nursery'
    : item.stock
      ? `${item.stock.nursery.nurseryName}${item.stock.priceCents != null ? ` · ₹${(item.stock.priceCents / 100).toFixed(0)}` : ''}`
      : '';

  const goTo = () => {
    if (item.nurseryId) navigation.navigate('NurseryPublicProfile', { nurseryId: item.nurseryId });
    else if (item.stock) navigation.navigate('NurseryPublicProfile', { nurseryId: item.stock.nursery.id });
  };

  return (
    <TouchableOpacity onPress={goTo} activeOpacity={0.85}>
      <BlurCard tint="light" noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => removeMutation.mutate(item.id)} hitSlop={10}>
          <Text style={styles.removeIcon}>♥</Text>
        </TouchableOpacity>
      </BlurCard>
    </TouchableOpacity>
  );
}

export function WishlistScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: items, isLoading } = useWishlist();

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
        <Text style={styles.headerTitle}>Wishlist</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !items || items.length === 0 ? (
        <EmptyState icon="♥" title="Nothing saved yet" body="Tap the heart on a nursery or sapling to save it here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <WishlistRow key={item.id} item={item} navigation={navigation} />
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  removeIcon: { fontSize: 20, color: COLORS.coral },
});
