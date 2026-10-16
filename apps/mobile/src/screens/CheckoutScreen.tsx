import React, { Suspense, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { useHaptics } from '../hooks/useHaptics';
import {
  useCart,
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useCheckout,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiAddress } from '../api/addresses';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { reverseGeocode, verifyPincode, type ApiPincodeCheck } from '../api/geocode';
import { isValidPincode } from '../utils/validation';
import { useConfirm } from '../context/ConfirmDialogContext';

import { TEXT } from '../constants/typography';

// Stripe's native module doesn't exist in Expo Go, so merely importing it throws. Loaded only once
// a payment is actually in flight – see PaymentSheetRunner's own comment.
const LazyPaymentSheetRunner = React.lazy(() => import('../components/payments/PaymentSheetRunner'));

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function AddressRow({
  address,
  selected,
  onPress,
  onEdit,
  onDelete,
}: {
  address: ApiAddress;
  selected: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard noPadding style={[styles.addressRow, selected && styles.addressRowSelected]}>
        <View style={styles.radioOuter}>{selected ? <View style={styles.radioInner} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {[address.line1, address.line2, address.landmark, `${address.city} ${address.pincode}`].filter(Boolean).join(', ')}
          </Text>
          <View style={styles.addressActions}>
            <TouchableOpacity onPress={onEdit} hitSlop={8}>
              <Text style={styles.addressActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8}>
              <Text style={[styles.addressActionText, styles.addressDeleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function CheckoutScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const { success, error: errorHaptic } = useHaptics();
  const { data: cart, isLoading: cartLoading, refetch: refetchCart } = useCart();
  const { data: addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddresses();
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const checkoutMutation = useCheckout();
  const { refreshing, onRefresh } = usePullToRefresh([refetchCart, refetchAddresses]);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Set while the form is editing an existing address instead of adding a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressListError, setAddressListError] = useState('');
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState('');
  // Non-null only while a real payment sheet is in flight – mounts LazyPaymentSheetRunner below.
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Does the typed pincode actually belong to the chosen address? Re-checked whenever either
  // changes; "Save address" stays blocked until the answer is a match.
  const [pincodeCheck, setPincodeCheck] = useState<{ status: 'idle' | 'checking' | ApiPincodeCheck['status']; actual?: string }>({
    status: 'idle',
  });
  useEffect(() => {
    if (!coords || !isValidPincode(pincode)) {
      setPincodeCheck({ status: 'idle' });
      return;
    }
    let stale = false;
    setPincodeCheck({ status: 'checking' });
    verifyPincode(coords.lat, coords.lng, pincode.trim())
      .then((r) => !stale && setPincodeCheck(r))
      .catch(() => !stale && setPincodeCheck({ status: 'unverified' }));
    return () => {
      stale = true;
    };
  }, [coords, pincode]);

  const pincodeNotice: { ok: boolean; text: string } | null =
    pincodeCheck.status === 'checking'
      ? { ok: true, text: 'Checking pincode…' }
      : pincodeCheck.status === 'match'
        ? { ok: true, text: '✓ Pincode matches this address' }
        : pincodeCheck.status === 'mismatch'
          ? {
              ok: false,
              text: pincodeCheck.actual
                ? `Pincode doesn’t match this address – the location is in ${pincodeCheck.actual}`
                : 'Pincode doesn’t match this address',
            }
          : pincodeCheck.status === 'unverified'
            ? { ok: false, text: 'We couldn’t verify this pincode right now. Check it and try again.' }
            : null;

  const activeAddresses = addresses ?? [];
  const currentAddressId = selectedAddressId ?? activeAddresses.find((a) => a.isDefault)?.id ?? activeAddresses[0]?.id ?? null;

  const deliveryFeeCents = cart && cart.subtotalCents >= 49900 ? 0 : 4900;
  // Flat ARTH platform fee, charged on every order – matches order.service.ts's PLATFORM_FEE_CENTS.
  // This is a display-only preview; the authoritative total is computed server-side at checkout.
  const platformFeeCents = 100;
  const totalCents = (cart?.subtotalCents ?? 0) + deliveryFeeCents + platformFeeCents;

  const useCurrentLocation = async () => {
    setLocating(true);
    setActionError('');
    setLocationNotice(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setCoords({ lat, lng });
        const found = await reverseGeocode(lat, lng).catch(() => null);
        if (found) {
          setLine1(found.label);
          setLocationNotice({ ok: true, text: '✓ Matched from GPS – check the address above is correct' });
        } else {
          setLocationNotice({ ok: false, text: "Pin captured, but we couldn't find an address for it – please type it above" });
        }
      } else {
        setActionError('Location permission is needed so deliveries can be tracked to this address.');
      }
    } catch {
      setActionError("Couldn't get your location. Please try again.");
    }
    setLocating(false);
  };

  const handleAddAddress = async () => {
    setActionError('');
    if (!line1.trim() || !pincode.trim()) return;
    if (!isValidPincode(pincode)) {
      setActionError('Enter a valid 6-digit pincode');
      return;
    }
    if (!coords) {
      setActionError('Tap "Use current location" so deliveries can be tracked to this address.');
      return;
    }
    if (pincodeCheck.status !== 'match') {
      setActionError('Enter a pincode that matches this address.');
      return;
    }
    const input = { line1: line1.trim(), pincode: pincode.trim(), lat: coords.lat, lng: coords.lng };
    let saved;
    try {
      saved = editingId
        ? await updateAddressMutation.mutateAsync({ id: editingId, input })
        : await createAddressMutation.mutateAsync(input);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not save the address. Please try again.');
      return;
    }
    setSelectedAddressId(saved.id);
    closeAddressForm();
  };

  const closeAddressForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setLine1('');
    setPincode('');
    setCoords(null);
    setLocationNotice(null);
    setActionError('');
  };

  const startEditAddress = (a: ApiAddress) => {
    setAddressListError('');
    setActionError('');
    setLocationNotice(null);
    setEditingId(a.id);
    setLine1(a.line1);
    setPincode(a.pincode);
    // Older addresses may have no saved pin; the user then re-picks one before saving.
    setCoords(a.lat != null && a.lng != null ? { lat: Number(a.lat), lng: Number(a.lng) } : null);
    setShowAddForm(true);
  };

  const confirmDeleteAddress = (a: ApiAddress) => {
    setAddressListError('');
    confirm('Delete address', `Delete ${a.label || 'this address'}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddressMutation.mutateAsync(a.id);
            if (selectedAddressId === a.id) setSelectedAddressId(null);
            if (editingId === a.id) closeAddressForm();
          } catch (e) {
            setAddressListError(e instanceof Error ? e.message : "Couldn't delete this address. Please try again.");
          }
        },
      },
    ]);
  };

  const handlePay = async () => {
    if (!currentAddressId) return;
    setActionError('');
    setPaying(true);
    try {
      const { clientSecret } = await checkoutMutation.mutateAsync({
        addressId: currentAddressId,
        customerNote: note.trim() || undefined,
      });

      // No Stripe key configured on the backend (local/dev only) – the order already came back
      // confirmed, so there's no payment sheet to present. Skip straight to success.
      if (clientSecret) {
        // The runner reports back through the three handlers below; `paying` stays true until then.
        setActiveClientSecret(clientSecret);
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
    }
    setPaying(false);
  };

  const handlePaymentSuccess = () => {
    setActiveClientSecret(null);
    setPaying(false);
    success();
    navigation.replace('MyOrders');
  };
  const handlePaymentCancel = () => {
    setActiveClientSecret(null);
    setPaying(false);
  };
  const handlePaymentError = (message: string) => {
    setActiveClientSecret(null);
    setPaying(false);
    errorHaptic();
    setActionError(message);
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
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <Text style={styles.sectionTitle}>Delivery address</Text>
          {activeAddresses.map((a) => (
            <AddressRow
              key={a.id}
              address={a}
              selected={a.id === currentAddressId}
              onPress={() => setSelectedAddressId(a.id)}
              onEdit={() => startEditAddress(a)}
              onDelete={() => confirmDeleteAddress(a)}
            />
          ))}
          {addressListError ? <Text style={[styles.locationNoticeText, styles.locationNoticeWarn]}>{addressListError}</Text> : null}

          {showAddForm ? (
            <BorderCard style={styles.card}>
              <Text style={styles.formTitle}>{editingId ? 'Edit address' : 'New address'}</Text>
              <AddressSearchField
                label="Address"
                value={line1}
                onChangeText={(text) => {
                  setLine1(text);
                  setCoords(null);
                  setLocationNotice(null);
                }}
                placeholder="eg - Flat / street / society"
                onSelectSuggestion={(s) => {
                  setLine1(s.label);
                  setCoords({ lat: s.lat, lng: s.lng });
                  setLocationNotice(null);
                }}
              />
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="eg - Pincode"
                placeholderTextColor={COLORS.textLight}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              {pincode.length > 0 && !isValidPincode(pincode) && (
                <Text style={styles.locationNoticeText}>Pincode must be 6 digits</Text>
              )}
              {pincodeNotice && (
                <Text style={[styles.locationNoticeText, pincodeNotice.ok ? styles.locationNoticeOk : styles.locationNoticeWarn]}>
                  {pincodeNotice.text}
                </Text>
              )}
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
                <Text style={styles.locationButtonText}>{locating ? 'Locating…' : '📍 Or use current location'}</Text>
              </TouchableOpacity>
              {locationNotice && (
                <Text style={[styles.locationNoticeText, locationNotice.ok ? styles.locationNoticeOk : styles.locationNoticeWarn]}>
                  {locationNotice.text}
                </Text>
              )}
              {actionError ? <Text style={[styles.locationNoticeText, styles.locationNoticeWarn]}>{actionError}</Text> : null}
              <AnimatedButton
                label={editingId ? 'Save changes' : 'Save address'}
                onPress={handleAddAddress}
                variant="secondary"
                size="md"
                fullWidth
                disabled={createAddressMutation.isPending || updateAddressMutation.isPending || !coords || pincodeCheck.status !== 'match'}
              />
              <TouchableOpacity onPress={closeAddressForm} style={styles.formCancel}>
                <Text style={styles.addressActionText}>Cancel</Text>
              </TouchableOpacity>
            </BorderCard>
          ) : (
            <TouchableOpacity onPress={() => { setEditingId(null); setShowAddForm(true); }} style={styles.addAddressButton}>
              <Text style={styles.addAddressText}>+ Add a new address</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Note for the nursery (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="eg - Please deliver after 5 pm, or call before arriving"
            placeholderTextColor={COLORS.textLight}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.noteCounter}>{note.length}/300</Text>

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
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform fee</Text>
              <Text style={styles.summaryValue}>{formatRupees(platformFeeCents)}</Text>
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

      {activeClientSecret && (
        <Suspense fallback={null}>
          <LazyPaymentSheetRunner
            clientSecret={activeClientSecret}
            merchantDisplayName="Arth"
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            onError={handlePaymentError}
          />
        </Suspense>
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
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: { ...TEXT.subheading, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  addressActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  addressActionText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  addressDeleteText: { color: COLORS.coral },
  formTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  formCancel: { alignItems: 'center', paddingVertical: 12 },
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
    // No fill – an outline on the page, not a panel laid over it. Matches FormField's recipe.
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  noteInput: { minHeight: 80, marginBottom: 2 },
  noteCounter: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginBottom: 8 },
  locationButton: { paddingVertical: 10, marginBottom: 10 },
  locationButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  locationNoticeText: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
  locationNoticeOk: { color: COLORS.forest },
  locationNoticeWarn: { color: COLORS.golden },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 8 },
  totalLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700' },
  totalValue: { ...TEXT.statSmall, fontSize: 17, color: COLORS.textPrimary },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginTop: 12 },
});
