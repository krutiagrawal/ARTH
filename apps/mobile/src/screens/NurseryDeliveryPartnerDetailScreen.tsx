import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { TEXT } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { useDeliveryPartnerOverview } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function callPartner(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

function whatsappPartner(phone: string) {
  // Bare 10-digit Indian numbers are stored without the country code.
  Linking.openURL(`https://wa.me/91${phone}`).catch(() => {});
}

function formatWhen(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <BorderCard style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </BorderCard>
  );
}

export function NurseryDeliveryPartnerDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const partnerId: string = route.params.partnerId;
  const { data, isLoading, refetch } = useDeliveryPartnerOverview(partnerId);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const partner = data?.partner;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      <ScreenHeader
        title={partner?.name ?? 'Delivery partner'}
        subtitle="Deliveries and performance"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading || !data || !partner ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <BorderCard>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{partner.name}</Text>
                <Text style={styles.sub}>{partner.phone} · @{partner.handle}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.pill, partner.isActive ? styles.pillOn : styles.pillOff]}>
                    <Text style={[styles.pillText, { color: partner.isActive ? COLORS.forest : COLORS.dangerDark }]}>
                      {partner.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </Text>
                  </View>
                  {partner.avgRating != null && (
                    <Text style={styles.rating}>★ {Number(partner.avgRating).toFixed(1)} ({partner.reviewCount})</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.contactRow}>
              {data.stats.activeNow > 0 && (
                <TouchableOpacity
                  style={[styles.contactBtn, styles.trackBtn]}
                  onPress={() => navigation.navigate('NurseryLiveMap', { focusPartnerId: partner.id })}
                >
                  <Text style={[styles.contactText, { color: COLORS.white }]}>📍 Track live</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.contactBtn} onPress={() => callPartner(partner.phone)}>
                <Text style={styles.contactText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactBtn} onPress={() => whatsappPartner(partner.phone)}>
                <Text style={styles.contactText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </BorderCard>

          <View style={styles.statGrid}>
            <StatTile value={String(data.stats.totalDelivered)} label="Delivered" />
            <StatTile value={String(data.stats.deliveredLast30d)} label="Last 30 days" />
            <StatTile value={String(data.stats.activeNow)} label="On delivery now" />
            <StatTile value={data.stats.avgDeliveryMinutes != null ? `${data.stats.avgDeliveryMinutes}m` : '–'} label="Avg delivery time" />
          </View>

          <Text style={styles.sectionTitle}>On delivery now</Text>
          {data.current.length === 0 ? (
            <Text style={styles.empty}>Not carrying any orders right now.</Text>
          ) : (
            data.current.map((o) => (
              <TouchableOpacity key={o.orderId} activeOpacity={0.8} onPress={() => navigation.navigate('NurseryOrderDetail', { orderId: o.orderId })}>
                <BorderCard style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <Text style={styles.orderCustomer} numberOfLines={1}>{o.customerName}</Text>
                    <View style={[styles.pill, o.started ? styles.pillOn : styles.pillWait]}>
                      <Text style={[styles.pillText, { color: o.started ? COLORS.forest : COLORS.textPrimary }]}>
                        {o.started ? 'EN ROUTE' : 'NOT STARTED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderSummary} numberOfLines={2}>{o.summary}</Text>
                  <Text style={styles.orderMeta}>
                    Dispatched {formatWhen(o.dispatchedAt)}{o.etaMinutes != null ? ` · ETA ${o.etaMinutes} min` : ''}
                  </Text>
                </BorderCard>
              </TouchableOpacity>
            ))
          )}

          <Text style={styles.sectionTitle}>Recent deliveries</Text>
          {data.recent.length === 0 ? (
            <Text style={styles.empty}>No completed deliveries yet.</Text>
          ) : (
            data.recent.map((o) => (
              <TouchableOpacity key={o.orderId} activeOpacity={0.8} onPress={() => navigation.navigate('NurseryOrderDetail', { orderId: o.orderId })}>
                <BorderCard style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <Text style={styles.orderCustomer} numberOfLines={1}>{o.customerName}</Text>
                    {o.rating != null && <Text style={styles.rating}>★ {o.rating}</Text>}
                  </View>
                  <Text style={styles.orderSummary} numberOfLines={2}>{o.summary}</Text>
                  <Text style={styles.orderMeta}>
                    Delivered {formatWhen(o.deliveredAt)}{o.minutes != null ? ` · took ${o.minutes} min` : ''}
                  </Text>
                </BorderCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...TEXT.heading, color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  pillOn: { backgroundColor: 'rgba(45,90,39,0.14)' },
  pillOff: { backgroundColor: 'rgba(200,60,60,0.12)' },
  pillWait: { backgroundColor: 'rgba(212,168,83,0.25)' },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.earth },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  contactBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.forest },
  trackBtn: { backgroundColor: COLORS.forest },
  contactText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statTile: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 2 },
  statValue: { ...TEXT.statSmall, fontSize: 22, color: COLORS.forest },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 22, marginBottom: 8 },
  empty: { fontSize: 12, color: COLORS.textMuted },
  orderCard: { marginBottom: 10, gap: 4 },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderCustomer: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  orderSummary: { fontSize: 12, color: COLORS.textPrimary },
  orderMeta: { fontSize: 11, color: COLORS.textSecondary },
});
