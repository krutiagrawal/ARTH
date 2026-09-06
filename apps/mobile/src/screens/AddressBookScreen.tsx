import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard, BlurCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { EmptyState } from '../components/common/EmptyState';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '../hooks/useApiQueries';
import type { ApiAddress } from '../api/addresses';

function AddressCard({ address }: { address: ApiAddress }) {
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();

  return (
    <BlurCard tint="light" noPadding style={styles.row}>
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
    </BlurCard>
  );
}

export function AddressBookScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: addresses, isLoading } = useAddresses();
  const createMutation = useCreateAddress();

  const [showForm, setShowForm] = useState(false);
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

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

  const handleAdd = async () => {
    if (!line1.trim() || !pincode.trim()) return;
    await createMutation.mutateAsync({ line1: line1.trim(), pincode: pincode.trim(), lat: coords?.lat, lng: coords?.lng });
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
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {!addresses || addresses.length === 0 ? (
            <EmptyState icon="📍" title="No saved addresses" body="Add one so checkout is faster next time." />
          ) : (
            addresses.map((a) => <AddressCard key={a.id} address={a} />)
          )}

          {showForm ? (
            <GlassCard variant="warm" style={styles.card}>
              <TextInput style={styles.input} placeholder="Flat / street / society" placeholderTextColor={COLORS.textMuted} value={line1} onChangeText={setLine1} />
              <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor={COLORS.textMuted} value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
                <Text style={styles.locationButtonText}>{locating ? 'Locating…' : coords ? '📍 Location captured' : '📍 Use current location'}</Text>
              </TouchableOpacity>
              <AnimatedButton label="Save address" onPress={handleAdd} variant="primary" size="md" fullWidth disabled={createMutation.isPending} />
            </GlassCard>
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
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
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
  addAddressButton: { paddingVertical: 12, alignItems: 'center' },
  addAddressText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
});
