import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useHaptics } from '../hooks/useHaptics';
import { useMyOrder, useCancelOrder, useSubmitOrderReview } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { OrderStatus } from '../api/orders';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

const STAGES: { key: OrderStatus; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function StatusTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  return (
    <View style={styles.timeline}>
      {STAGES.map((stage, i) => {
        const done = currentIndex >= i;
        return (
          <View key={stage.key} style={styles.timelineStep}>
            <View style={[styles.timelineDot, done && styles.timelineDotDone]} />
            <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]}>{stage.label}</Text>
            {i < STAGES.length - 1 ? <View style={[styles.timelineLine, currentIndex > i && styles.timelineLineDone]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const submitMutation = useSubmitOrderReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { success } = useHaptics();

  if (submitted) {
    return (
      <BorderCard style={styles.card}>
        <Text style={styles.reviewThanks}>Thanks for your review! 🌱</Text>
      </BorderCard>
    );
  }

  return (
    <BorderCard style={styles.card}>
      <Text style={styles.sectionTitle}>Rate this nursery</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="How was the delivery? (optional)"
        placeholderTextColor={COLORS.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <AnimatedButton
        label={submitMutation.isPending ? 'Submitting…' : 'Submit review'}
        onPress={async () => {
          await submitMutation.mutateAsync({ id: orderId, input: { nurseryRating: rating, comment: comment.trim() || undefined } });
          success();
          setSubmitted(true);
        }}
        variant="secondary"
        size="md"
        fullWidth
        disabled={submitMutation.isPending}
      />
    </BorderCard>
  );
}

export function OrderDetailScreen({ route, navigation }: any) {
  const orderId: string = route?.params?.orderId;
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: order, isLoading } = useMyOrder(orderId);
  const cancelMutation = useCancelOrder();
  const [actionError, setActionError] = useState('');

  const handleCancel = async () => {
    setActionError('');
    try {
      await cancelMutation.mutateAsync(orderId);
      success();
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Could not cancel this order.');
    }
  };

  const canCancel = order && ['pending_payment', 'confirmed'].includes(order.status);
  const showTracking = order?.status === 'out_for_delivery' && order.tracking?.lat != null && order.tracking?.lng != null;

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
        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !order ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {order.status === 'cancelled' ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This order was cancelled.</Text>
            </View>
          ) : (
            <StatusTimeline status={order.status} />
          )}

          {showTracking && order.tracking && (
            <View style={styles.mapWrap}>
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                region={{ latitude: order.tracking.lat!, longitude: order.tracking.lng!, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
              >
                <Marker coordinate={{ latitude: order.tracking.lat!, longitude: order.tracking.lng! }}>
                  <Text style={{ fontSize: 28 }}>🌱</Text>
                </Marker>
              </MapView>
              <View style={styles.etaBadge}>
                <Text style={styles.etaText}>
                  {order.tracking.etaMinutes != null ? `Arriving in ~${order.tracking.etaMinutes} min` : 'On the way'}
                </Text>
              </View>
            </View>
          )}

          {order.status === 'out_for_delivery' && order.deliveryOtp && (
            <BorderCard style={styles.card}>
              <Text style={styles.otpLabel}>Delivery OTP – share this with the rider</Text>
              <Text style={styles.otpValue}>{order.deliveryOtp}</Text>
            </BorderCard>
          )}

          {order.tracking?.riderName && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => order.tracking?.riderPhone && Linking.openURL(`tel:${order.tracking.riderPhone}`)}
            >
              <Text style={styles.callButtonText}>📞 {order.tracking.riderName}{order.tracking.riderPhone ? ` · ${order.tracking.riderPhone}` : ''}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>{order.nursery.nurseryName}</Text>
          <BorderCard style={styles.card}>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.species} × {item.quantity}</Text>
                <Text style={styles.summaryValue}>{formatRupees(item.unitPriceCents * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>{order.deliveryFeeCents === 0 ? 'Free' : formatRupees(order.deliveryFeeCents)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupees(order.totalCents)}</Text>
            </View>
          </BorderCard>

          <Text style={styles.sectionTitle}>Delivering to</Text>
          <BorderCard style={styles.card}>
            <Text style={styles.addressText}>
              {[order.address.line1, order.address.line2, order.address.landmark, `${order.address.city} ${order.address.pincode}`].filter(Boolean).join(', ')}
            </Text>
          </BorderCard>

          {order.status === 'delivered' && !order.review && <ReviewForm orderId={order.id} />}
          {order.review && (
            <BorderCard style={styles.card}>
              <Text style={styles.reviewThanks}>Your rating: {'★'.repeat(order.review.nurseryRating)}</Text>
              {order.review.comment ? <Text style={styles.addressText}>{order.review.comment}</Text> : null}
            </BorderCard>
          )}

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          {canCancel && (
            <AnimatedButton
              label={cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
              onPress={handleCancel}
              variant="secondary"
              size="md"
              fullWidth
              disabled={cancelMutation.isPending}
              style={{ marginTop: 8 }}
            />
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  timeline: { flexDirection: 'row', marginBottom: 20, marginTop: 8 },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.sand, marginBottom: 6 },
  timelineDotDone: { backgroundColor: COLORS.forest },
  timelineLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  timelineLabelDone: { color: COLORS.forest, fontWeight: '700' },
  timelineLine: { position: 'absolute', top: 6, left: '50%', width: '100%', height: 2, backgroundColor: COLORS.sand, zIndex: -1 },
  timelineLineDone: { backgroundColor: COLORS.forest },
  mapWrap: { height: 180, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  etaBadge: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: RADIUS.md, padding: 8, alignItems: 'center' },
  etaText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  otpLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  otpValue: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 6, marginTop: 4 },
  callButton: { marginBottom: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: 'rgba(94,133,80,0.1)', alignItems: 'center' },
  callButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12, marginBottom: 8 },
  card: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 8 },
  totalLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },
  totalValue: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '800' },
  addressText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginTop: 8 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { fontSize: 32, color: COLORS.sand },
  starActive: { color: COLORS.amber },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.2)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  reviewThanks: { fontSize: 14, fontWeight: '700', color: COLORS.forest, marginBottom: 4 },
});
