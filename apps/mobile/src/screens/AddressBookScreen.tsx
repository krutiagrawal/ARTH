import React, { useState } from 'react';
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
import { EmptyState } from '../components/common/EmptyState';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiAddress } from '../api/addresses';

function AddressCard({ address }: { address: ApiAddress }) {
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();

  return (
    <BorderCard noPadding style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHeader}>
          <Text style={styles.label}>{address.label || 'Address'}</Text>
          {address.isDefault ? <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View> : null}
        </View>
        <Text style={styles.text}>
          {[address.line1, address.line2, address.landmark, `${address.city} ${address.pincode}`].filter(Boolean).join(', ')}
        </Text>
        <View style={styles.actionsRow}>
          {!address.isDefault && (
            <TouchableOpacity onPress={() => updateMutation.mutate({ id: address.id, input: { isDefault: true } })}>
              <Text style={styles.actionText}>Set as default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => deleteMutation.mutate(address.id)}>
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BorderCard>
  );
}

export function AddressBookScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: addresses, isLoading, refetch } = useAddresses();
  const createMutation = useCreateAddress();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [showForm, setShowForm] = useState(false);
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCurrentLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        setError('Location permission is needed so deliveries can be tracked to this address.');
      }
    } catch {
      setError("Couldn't get your location. Please try again.");
    }
    setLocating(false);
  };

  const handleAdd = async () => {
    setError(null);
    if (!line1.trim() || !pincode.trim()) return;
    if (!coords) {
      setError('Tap "Use current location" so deliveries can be tracked to this address.');
      return;
    }
    await createMutation.mutateAsync({ line1: line1.trim(), pincode: pincode.trim(), lat: coords.lat, lng: coords.lng });
    setShowForm(false);
    setLine1('');
    setPincode('');
    setCoords(null);
  };

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
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {!addresses || addresses.length === 0 ? (
            <EmptyState icon="📍" title="No saved addresses" body="Add one so checkout is faster next time." />
          ) : (
            addresses.map((a) => <AddressCard key={a.id} address={a} />)
          )}

          {showForm ? (
            <BorderCard style={styles.card}>
              <AddressSearchField
                label="Address"
                value={line1}
                onChangeText={(text) => {
                  setLine1(text);
                  setCoords(null);
                }}
                placeholder="eg - Flat / street / society"
                onSelectSuggestion={(s) => {
                  setLine1(s.label);
                  setCoords({ lat: s.lat, lng: s.lng });
                }}
              />
              <TextInput style={styles.input} placeholder="eg - Pincode" placeholderTextColor={COLORS.textLight} value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
                <Text style={styles.locationButtonText}>{locating ? 'Locating…' : coords ? '📍 Location captured' : '📍 Or use current location'}</Text>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
              <AnimatedButton label="Save address" onPress={handleAdd} variant="primary" size="md" fullWidth disabled={createMutation.isPending || !coords} />
            </BorderCard>
          ) : (
            <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addAddressButton}>
              <Text style={styles.addAddressText}>+ Add a new address</Text>
            </TouchableOpacity>
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
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  defaultBadge: { backgroundColor: COLORS.mintLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.forest },
  text: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  deleteText: { color: COLORS.dangerDark },
  card: { marginBottom: 8 },
  input: {
    // No fill — an outline on the page, not a panel laid over it. Matches FormField's recipe.
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  locationButton: { paddingVertical: 10, marginBottom: 10 },
  locationButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  errorText: { fontSize: 12, color: COLORS.dangerDark, marginBottom: 10 },
  addAddressButton: { paddingVertical: 12, alignItems: 'center' },
  addAddressText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
});
