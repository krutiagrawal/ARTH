import React, { Suspense, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { MapErrorBoundary } from '../components/common/MapErrorBoundary';
import { useLiveFleet } from '../hooks/useApiQueries';

// Lazy for the same reason as the customer tracking map: keeps the WebView out of the eager
// screen graph, with MapErrorBoundary catching a failed load.
const LazyLiveFleetMap = React.lazy(() => import('../components/common/LiveFleetMap').then((m) => ({ default: m.LiveFleetMap })));

function secondsAgo(iso: string | null) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

export function NurseryLiveMapScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { data: fleet, isLoading, dataUpdatedAt } = useLiveFleet();
  const [selectedId, setSelectedId] = useState<string | null>(route?.params?.focusPartnerId ?? null);
  // Re-render every few seconds so "Updated 12s ago" keeps counting between polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const riders = fleet?.riders ?? [];
  const selected = riders.find((r) => r.partnerId === selectedId) ?? null;
  const livePins = riders.filter((r) => r.lat != null).length;
  const updatedLabel = dataUpdatedAt ? secondsAgo(new Date(dataUpdatedAt).toISOString()) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      <ScreenHeader
        title="Live Map"
        subtitle={isLoading ? 'Loading…' : `${riders.length} rider${riders.length === 1 ? '' : 's'} on delivery · ${livePins} live${updatedLabel ? ` · updated ${updatedLabel}` : ''}`}
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      <View style={styles.mapWrap}>
        <MapErrorBoundary>
          <Suspense fallback={<ActivityIndicator color={COLORS.sage} style={{ flex: 1 }} />}>
            <LazyLiveFleetMap fleet={fleet} selectedId={selectedId} onSelectRider={setSelectedId} />
          </Suspense>
        </MapErrorBoundary>
        {!isLoading && riders.length === 0 && (
          <View style={styles.emptyOverlay} pointerEvents="none">
            <Text style={styles.emptyText}>No riders are out for delivery right now.</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {riders.map((r) => {
          const isSel = r.partnerId === selectedId;
          return (
            <TouchableOpacity key={r.partnerId} activeOpacity={0.85} onPress={() => setSelectedId(isSel ? null : r.partnerId)}>
              <BorderCard style={[styles.riderCard, isSel && styles.riderCardSel]}>
                <View style={styles.riderTop}>
                  <Text style={styles.riderEmoji}>🛵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderName}>{r.name}</Text>
                    <Text style={styles.riderMeta}>
                      {r.lat != null ? `📍 Live · ${secondsAgo(r.updatedAt) ?? ''}` : 'Not started yet – no location'} · {r.orders.length} order{r.orders.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${r.phone}`).catch(() => {})} hitSlop={8} style={styles.callBtn}>
                    <Text style={styles.callText}>📞</Text>
                  </TouchableOpacity>
                </View>

                {isSel &&
                  r.orders.map((o) => (
                    <TouchableOpacity
                      key={o.orderId}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('NurseryOrderDetail', { orderId: o.orderId })}
                      style={styles.orderRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderCustomer} numberOfLines={1}>🏠 {o.customerName}</Text>
                        <Text style={styles.orderMeta} numberOfLines={1}>{o.summary}</Text>
                        {o.destination.label ? <Text style={styles.orderMeta} numberOfLines={1}>{o.destination.label}</Text> : null}
                      </View>
                      <View style={styles.orderRight}>
                        <Text style={[styles.statusChip, { color: o.started ? COLORS.forest : COLORS.textSecondary }]}>
                          {o.started ? 'EN ROUTE' : 'QUEUED'}
                        </Text>
                        {o.etaMinutes != null && <Text style={styles.eta}>~{o.etaMinutes} min</Text>}
                      </View>
                    </TouchableOpacity>
                  ))}
              </BorderCard>
            </TouchableOpacity>
          );
        })}
        {selected && selected.lat == null && (
          <Text style={styles.note}>This rider has orders assigned but hasn't started a delivery, so there's no live position yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrap: { flex: 1, minHeight: 240, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#D8E8C8' },
  emptyOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, fontWeight: '700', color: COLORS.forest, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  panel: { maxHeight: '42%', flexGrow: 0 },
  panelContent: { paddingHorizontal: SPACING.md, paddingTop: 12 },
  riderCard: { marginBottom: 10, gap: 8 },
  riderCardSel: { borderColor: COLORS.golden },
  riderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riderEmoji: { fontSize: 24 },
  riderName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  riderMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  callBtn: { padding: 6 },
  callText: { fontSize: 18 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.warmBrown },
  orderCustomer: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  orderMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  orderRight: { alignItems: 'flex-end' },
  statusChip: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  eta: { fontSize: 12, fontWeight: '700', color: COLORS.forest, marginTop: 2 },
  note: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: 8 },
});
