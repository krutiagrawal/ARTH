import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { StatusModal } from '../components/common/StatusModal';
import { SaplingQrCode } from '../components/common/SaplingQrCode';
import { useHaptics } from '../hooks/useHaptics';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useNurseryOrder,
  usePackOrder,
  useDispatchOrder,
  useDeliverOrder,
  useReadyForPickupOrder,
  usePickedUpOrder,
  useCancelNurseryOrder,
  useNurseryProfile,
} from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { ApiError } from '../api/client';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function NurseryOrderDetailScreen({ route, navigation }: any) {
  const orderId: string = route?.params?.orderId;
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const confirm = useConfirm();
  const { data: order, isLoading } = useNurseryOrder(orderId);
  const packMutation = usePackOrder();
  const dispatchMutation = useDispatchOrder();
  const deliverMutation = useDeliverOrder();
  const readyForPickupMutation = useReadyForPickupOrder();
  const pickedUpMutation = usePickedUpOrder();
  const cancelMutation = useCancelNurseryOrder();

  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [code, setCode] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
      success();
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  };

  const handleCancel = () => {
    confirm('Cancel this order?', 'The customer will be refunded and notified.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: guard(() => run(() => cancelMutation.mutateAsync(orderId))) },
    ]);
  };

  const isPickup = order?.fulfillmentType === 'pickup';

  // Every issued sapling unit for this order, flattened out of each item — only populated once
  // this came from the order-detail endpoint (see api/nursery.ts's ApiNurseryOrder).
  const allSaplingUnits = order ? order.items.flatMap((item) => item.saplingUnits ?? []) : [];
  const showQrSection = !!order && ['packed', 'ready_for_pickup', 'out_for_delivery', 'picked_up', 'delivered', 'plantation_verified'].includes(order.status) && allSaplingUnits.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Order" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      {isLoading || !order ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <BorderCard style={styles.card}>
            <Text style={styles.customer}>{order.user.name}</Text>
            <Text style={styles.handle}>@{order.user.handle}</Text>
            <View style={styles.fulfillmentTag}>
              <Text style={styles.fulfillmentTagText}>{isPickup ? '🚶 Pickup' : '🚴 Delivery'}{order.pickupWindowLabel ? ` · ${order.pickupWindowLabel}` : ''}</Text>
            </View>
            <View style={styles.divider} />
            {order.items.map((item, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.species} × {item.quantity}</Text>
                <Text style={styles.summaryValue}>{formatRupees(item.unitPriceCents * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupees(order.totalCents)}</Text>
            </View>
          </BorderCard>

          {!isPickup && order.address && (
            <>
              <Text style={styles.sectionTitle}>Deliver to</Text>
              <BorderCard style={styles.card}>
                <Text style={styles.addressText}>
                  {[order.address.line1, order.address.line2, order.address.landmark, `${order.address.city} ${order.address.pincode}`].filter(Boolean).join(', ')}
                </Text>
              </BorderCard>
            </>
          )}

          {showQrSection && (
            <>
              <Text style={styles.sectionTitle}>Sapling QR codes</Text>
              <BorderCard style={styles.card}>
                <Text style={styles.qrHint}>Show or print these at handoff — each one traces back to this order once planted.</Text>
                <View style={styles.qrGrid}>
                  {allSaplingUnits.map((unit) => (
                    <SaplingQrCode key={unit.id} unitId={unit.id} size={92} label={unit.speciesNameSnapshot ?? unit.species} />
                  ))}
                </View>
              </BorderCard>
            </>
          )}

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

          {order.status === 'confirmed' && (
            <AnimatedButton
              label={packMutation.isPending ? 'Marking packed…' : 'Mark as packed'}
              onPress={guard(() => run(() => packMutation.mutateAsync(orderId)))}
              disabled={packMutation.isPending}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}

          {order.status === 'packed' && isPickup && (
            <AnimatedButton
              label={readyForPickupMutation.isPending ? 'Marking ready…' : 'Mark ready for pickup'}
              onPress={guard(() => run(() => readyForPickupMutation.mutateAsync(orderId)))}
              disabled={readyForPickupMutation.isPending}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}

          {order.status === 'ready_for_pickup' && isPickup && (
            <>
              {order.handoffCode && (
                <View style={styles.otpHint}>
                  <Text style={styles.otpHintText}>Ask the planter for their handoff code</Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>Handoff code</Text>
              <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="4-digit code" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" maxLength={4} />
              <AnimatedButton
                label={pickedUpMutation.isPending ? 'Confirming…' : 'Confirm picked up'}
                onPress={guard(() => run(() => pickedUpMutation.mutateAsync({ id: orderId, code: code.trim() })))}
                disabled={pickedUpMutation.isPending || code.trim().length !== 4}
                variant="primary"
                size="lg"
                fullWidth
              />
            </>
          )}

          {order.status === 'packed' && !isPickup && (
            <>
              <Text style={styles.fieldLabel}>Rider name</Text>
              <TextInput style={styles.input} value={riderName} onChangeText={setRiderName} placeholder="Who's delivering this?" placeholderTextColor={COLORS.textMuted} />
              <Text style={styles.fieldLabel}>Rider phone</Text>
              <TextInput style={styles.input} value={riderPhone} onChangeText={setRiderPhone} placeholder="Contact number" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" />
              <AnimatedButton
                label={dispatchMutation.isPending ? 'Dispatching…' : 'Dispatch order'}
                onPress={guard(() => run(() => dispatchMutation.mutateAsync({ id: orderId, riderName: riderName.trim() || undefined, riderPhone: riderPhone.trim() || undefined })))}
                disabled={dispatchMutation.isPending}
                variant="primary"
                size="lg"
                fullWidth
              />
            </>
          )}

          {order.status === 'out_for_delivery' && !isPickup && (
            <>
              {order.handoffCode && (
                <View style={styles.otpHint}>
                  <Text style={styles.otpHintText}>Ask the customer for their delivery code</Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>Delivery code</Text>
              <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="4-digit code" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" maxLength={4} />
              <AnimatedButton
                label={deliverMutation.isPending ? 'Confirming…' : 'Confirm delivery'}
                onPress={guard(() => run(() => deliverMutation.mutateAsync({ id: orderId, code: code.trim() })))}
                disabled={deliverMutation.isPending || code.trim().length !== 4}
                variant="primary"
                size="lg"
                fullWidth
              />
            </>
          )}

          {['confirmed', 'packed'].includes(order.status) && (
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel this order</Text>
            </TouchableOpacity>
          )}

          {order.status === 'picked_up' && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneText}>✅ Picked up</Text>
            </View>
          )}
          {order.status === 'delivered' && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneText}>✅ Delivered</Text>
            </View>
          )}
          {order.status === 'plantation_verified' && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneText}>🌳 Plantation verified</Text>
            </View>
          )}
          {order.status === 'cancelled' && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This order was cancelled and refunded.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md },
  card: { marginBottom: 16 },
  customer: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  handle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  fulfillmentTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(94,133,80,0.1)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  fulfillmentTagText: { fontSize: 11, fontWeight: '700', color: COLORS.forest },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  totalLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },
  totalValue: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '800' },
  addressText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  qrHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 4 },
  input: {
    // No fill — an outline on the page, not a panel laid over it. Matches FormField's recipe.
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  otpHint: { backgroundColor: 'rgba(212,168,83,0.15)', borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  otpHintText: { fontSize: 12, color: COLORS.earth, fontWeight: '600', textAlign: 'center' },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  cancelButton: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 13, fontWeight: '700', color: COLORS.dangerDark },
  doneBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 16 },
  doneText: { fontSize: 14, color: COLORS.forest, fontWeight: '700', textAlign: 'center' },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
