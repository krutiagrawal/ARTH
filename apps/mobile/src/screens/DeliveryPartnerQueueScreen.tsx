import React, { Suspense, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { MapErrorBoundary } from '../components/common/MapErrorBoundary';
import { Sheet } from '../components/common/Sheet';
import { useHaptics } from '../hooks/useHaptics';
import { useMyDeliveryQueue, useStartDelivery, useCompleteDelivery } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiDeliveryQueueItem } from '../api/deliveryPartnerApp';

// This screen must never import react-native-maps directly — Metro evaluates the whole package
// on import, including its native MapView binding, which has no native module in Expo Go on
// Android. React.lazy() defers that import until the map component actually mounts, and
// MapErrorBoundary (below) catches it failing instead of taking down this whole card.
const LazyRiderDeliveryMap = React.lazy(() =>
  import('../components/common/RiderDeliveryMap').then((m) => ({ default: m.RiderDeliveryMap }))
);

/** Live device position for the "where am I relative to the destination" map — separate from
 * useDeliveryLocationReporting, which posts this same kind of fix to the backend for the
 * customer's tracking map. This one only drives the local map view and never leaves the device.
 * Active only while at least one order has been started (see DeliveryPartnerQueueScreen). */
function useRiderLiveLocation(active: boolean) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setLocation(null);
      return;
    }
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
        (loc) => setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active]);

  return location;
}

function QueueCard({
  item,
  riderLocation,
  onStart,
  starting,
  onDeliver,
}: {
  item: ApiDeliveryQueueItem;
  riderLocation: { lat: number; lng: number } | null;
  onStart: () => void;
  starting: boolean;
  onDeliver: () => void;
}) {
  const addressText = item.address
    ? [item.address.line1, item.address.line2, item.address.landmark, `${item.address.city} ${item.address.pincode}`].filter(Boolean).join(', ')
    : null;
  const destination = item.address?.lat != null && item.address?.lng != null ? { lat: item.address.lat, lng: item.address.lng } : null;

  return (
    <BorderCard style={styles.card}>
      <Text style={styles.customer}>{item.customer.name}</Text>
      <Text style={styles.handle}>@{item.customer.handle}</Text>
      {addressText && <Text style={styles.address}>{addressText}</Text>}
      <Text style={styles.itemsSummary}>
        {item.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')} ({item.itemCount} total)
      </Text>
      <Text style={styles.nurseryTag}>From {item.nursery.nurseryName}</Text>

      {item.startedAt && (
        destination ? (
          <MapErrorBoundary>
            <Suspense fallback={<View style={styles.mapPlaceholder} />}>
              <LazyRiderDeliveryMap rider={riderLocation} destination={destination} />
            </Suspense>
          </MapErrorBoundary>
        ) : (
          <View style={styles.noLocationBanner}>
            <Text style={styles.noLocationBannerText}>
              No saved location for this address — use the address above and contact the customer for directions.
            </Text>
          </View>
        )
      )}

      {!item.startedAt ? (
        <AnimatedButton
          label={starting ? 'Starting…' : '🚴 Start delivery'}
          onPress={onStart}
          disabled={starting}
          variant="primary"
          size="md"
          fullWidth
          style={{ marginTop: 10 }}
        />
      ) : (
        <AnimatedButton label="Mark delivered" onPress={onDeliver} variant="primary" size="md" fullWidth style={{ marginTop: 10 }} />
      )}
    </BorderCard>
  );
}

function DeliverSheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const completeMutation = useCompleteDelivery();
  const { success, error: errorHaptic } = useHaptics();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!orderId) return;
    setError('');
    try {
      await completeMutation.mutateAsync({ orderId, code: code.trim() });
      success();
      setCode('');
      onClose();
    } catch (e) {
      errorHaptic();
      setError(e instanceof ApiError ? e.message : 'Could not confirm delivery.');
    }
  };

  return (
    <Sheet visible={!!orderId} onClose={onClose} title="Confirm delivery">
      <View style={{ gap: 4 }}>
        <Text style={styles.sheetHint}>Ask the customer for their delivery code and enter it below.</Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={setCode}
          placeholder="4-digit code"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
          maxLength={4}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <AnimatedButton
          label={completeMutation.isPending ? 'Confirming…' : 'Confirm delivery'}
          onPress={handleConfirm}
          disabled={completeMutation.isPending || code.trim().length !== 4}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: 8 }}
        />
      </View>
    </Sheet>
  );
}

export function DeliveryPartnerQueueScreen() {
  const insets = useSafeAreaInsets();
  const { data: queue = [], isLoading } = useMyDeliveryQueue();
  const startMutation = useStartDelivery();
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);

  const hasStartedDelivery = queue.some((item) => item.startedAt != null);
  const riderLocation = useRiderLiveLocation(hasStartedDelivery);

  const handleStart = async (orderId: string) => {
    setStartingOrderId(orderId);
    try {
      await startMutation.mutateAsync(orderId);
    } finally {
      setStartingOrderId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="My Deliveries" subtitle="Orders assigned to you" />

      {hasStartedDelivery && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🌱 Delivery in progress — keep this app open so we can track your location.</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : queue.length === 0 ? (
        <EmptyState icon="🛵" title="No deliveries yet" body="Once a nursery assigns you an order, it'll show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {queue.map((item) => (
            <QueueCard
              key={item.orderId}
              item={item}
              riderLocation={riderLocation}
              starting={startingOrderId === item.orderId}
              onStart={() => handleStart(item.orderId)}
              onDeliver={() => setDeliveringOrderId(item.orderId)}
            />
          ))}
        </ScrollView>
      )}

      <DeliverSheet orderId={deliveringOrderId} onClose={() => setDeliveringOrderId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { backgroundColor: 'rgba(212,168,83,0.18)', marginHorizontal: SPACING.md, borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  bannerText: { fontSize: 12, color: COLORS.earth, fontWeight: '600', textAlign: 'center' },
  list: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  card: { marginBottom: 12 },
  customer: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  handle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  address: { fontSize: 13, color: COLORS.textPrimary, marginTop: 8, lineHeight: 18 },
  itemsSummary: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  nurseryTag: { fontSize: 11, fontWeight: '700', color: COLORS.forest, marginTop: 8 },
  mapPlaceholder: { height: 180, borderRadius: RADIUS.lg, marginTop: 10 },
  noLocationBanner: { backgroundColor: 'rgba(212,168,83,0.18)', borderRadius: RADIUS.md, padding: 10, marginTop: 10 },
  noLocationBannerText: { fontSize: 12, color: COLORS.earth, fontWeight: '600', textAlign: 'center' },
  sheetHint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  codeInput: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 8 },
});
