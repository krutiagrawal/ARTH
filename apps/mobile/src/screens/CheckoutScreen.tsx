import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useStripe } from '@stripe/stripe-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useHaptics } from '../hooks/useHaptics';
import { useCart, useAddresses, useCreateAddress, useCheckout } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiAddress } from '../api/addresses';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function AddressRow({ address, selected, onPress }: { address: ApiAddress; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={[styles.addressRow, selected && styles.addressRowSelected]}>
        <View style={styles.radioOuter}>{selected ? <View style={styles.radioInner} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {[address.line1, address.line2, address.landmark, `${address.city} ${address.pincode}`].filter(Boolean).join(', ')}
          </Text>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function CheckoutScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const createAddressMutation = useCreateAddress();
  const checkoutMutation = useCheckout();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [paying, setPaying] = useState(false);

  const activeAddresses = addresses ?? [];
  const currentAddressId = selectedAddressId ?? activeAddresses.find((a) => a.isDefault)?.id ?? activeAddresses[0]?.id ?? null;

  const deliveryFeeCents = cart && cart.subtotalCents >= 49900 ? 0 : 4900;
  const totalCents = (cart?.subtotalCents ?? 0) + deliveryFeeCents;

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
    setLocating(false);
  };

  const handleAddAddress = async () => {
    if (!line1.trim() || !pincode.trim()) return;
    const created = await createAddressMutation.mutateAsync({
      line1: line1.trim(),
      pincode: pincode.trim(),
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setSelectedAddressId(created.id);
    setShowAddForm(false);
    setLine1('');
    setPincode('');
    setCoords(null);
  };

  const handlePay = async () => {
    if (!currentAddressId) return;
    setActionError('');
    setPaying(true);
    try {
      const { clientSecret } = await checkoutMutation.mutateAsync(currentAddressId);

      const { error: initError } = await initPaymentSheet({ merchantDisplayName: 'PLANT', paymentIntentClientSecret: clientSecret });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        setPaying(false);
        return;
      }

      success();
      navigation.replace('MyOrders');
    } catch (e) {
      errorHaptic();
      if (e instanceof ApiError && e.code === 'SERVICE_UNAVAILABLE') {
        setActionError('Payments aren’t live yet – please check back soon.');
      } else {
        setActionError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

  const isLoading = cartLoading || addressesLoading;

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
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          {activeAddresses.map((a) => (
            <AddressRow key={a.id} address={a} selected={a.id === currentAddressId} onPress={() => setSelectedAddressId(a.id)} />
          ))}

          {showAddForm ? (
            <BorderCard style={styles.card}>
              <TextInput style={styles.input} placeholder="Flat / street / society" placeholderTextColor={COLORS.textMuted} value={line1} onChangeText={setLine1} />
              <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor={COLORS.textMuted} value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
                <Text style={styles.locationButtonText}>{locating ? 'Locating…' : coords ? '📍 Location captured' : '📍 Use current location'}</Text>
              </TouchableOpacity>
              <AnimatedButton label="Save address" onPress={handleAddAddress} variant="secondary" size="md" fullWidth disabled={createAddressMutation.isPending} />
            </BorderCard>
          ) : (
            <TouchableOpacity onPress={() => setShowAddForm(true)} style={styles.addAddressButton}>
              <Text style={styles.addAddressText}>+ Add a new address</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Order summary</Text>
          <BorderCard style={styles.card}>
            {cart?.items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.species} × {item.quantity}</Text>
                <Text style={styles.summaryValue}>{formatRupees(item.lineTotalCents)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatRupees(cart?.subtotalCents ?? 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>{deliveryFeeCents === 0 ? 'Free' : formatRupees(deliveryFeeCents)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupees(totalCents)}</Text>
            </View>
          </BorderCard>

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
          <AnimatedButton
            label={paying ? 'Processing…' : `Pay ${formatRupees(totalCents)}`}
            onPress={handlePay}
            disabled={paying || !currentAddressId || !cart?.items.length}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 12 },
  addressRowSelected: { borderWidth: 1.5, borderColor: COLORS.forest },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.sage, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.forest },
  addressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  addressText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addAddressButton: { paddingVertical: 12, alignItems: 'center' },
  addAddressText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  card: { marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.2)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  locationButton: { paddingVertical: 10, marginBottom: 10 },
  locationButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 8 },
  totalLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },
  totalValue: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '800' },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginTop: 12 },
});
