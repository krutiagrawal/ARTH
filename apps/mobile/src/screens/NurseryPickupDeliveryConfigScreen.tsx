import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Toggle } from '../components/common/Toggle';
import { StatusModal } from '../components/common/StatusModal';
import { useNurseryProfile, useUpdateNurseryProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { ApiError } from '../api/client';
import type { OperatingHourRow, PickupWindowRow } from '../api/nursery';

const DAY_OPTIONS: OperatingHourRow['day'][] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<OperatingHourRow['day'], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export function NurseryPickupDeliveryConfigScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useNurseryProfile();
  const updateMutation = useUpdateNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [deliveryFeeCents, setDeliveryFeeCents] = useState('');
  const [minDeliveryOrderCents, setMinDeliveryOrderCents] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [operatingHours, setOperatingHours] = useState<OperatingHourRow[]>([]);
  const [pickupWindows, setPickupWindows] = useState<PickupWindowRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setOffersPickup(profile.offersPickup ?? true);
    setOffersDelivery(profile.offersDelivery ?? false);
    setDeliveryFeeCents(profile.deliveryFeeCents != null ? String(profile.deliveryFeeCents / 100) : '');
    setMinDeliveryOrderCents(profile.minDeliveryOrderCents != null ? String(profile.minDeliveryOrderCents / 100) : '');
    setDeliveryRadiusKm(profile.deliveryRadiusKm != null ? String(profile.deliveryRadiusKm) : '');
    setPickupInstructions(profile.pickupInstructions ?? '');
    setOperatingHours(profile.operatingHours ?? []);
    setPickupWindows(profile.pickupWindows ?? []);
  }, [profile]);

  const addHourRow = () => setOperatingHours((prev) => [...prev, { day: 'mon', opensAt: '09:00', closesAt: '18:00' }]);
  const removeHourRow = (i: number) => setOperatingHours((prev) => prev.filter((_, idx) => idx !== i));
  const updateHourRow = (i: number, patch: Partial<OperatingHourRow>) =>
    setOperatingHours((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addWindowRow = () => setPickupWindows((prev) => [...prev, { label: 'Morning', startTime: '09:00', endTime: '12:00' }]);
  const removeWindowRow = (i: number) => setPickupWindows((prev) => prev.filter((_, idx) => idx !== i));
  const updateWindowRow = (i: number, patch: Partial<PickupWindowRow>) =>
    setPickupWindows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!offersPickup && !offersDelivery) {
      setError('Enable at least one of pickup or delivery — you can’t turn both off.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        offersPickup,
        offersDelivery,
        deliveryFeeCents: deliveryFeeCents.trim() ? Math.round(Number(deliveryFeeCents) * 100) : null,
        minDeliveryOrderCents: minDeliveryOrderCents.trim() ? Math.round(Number(minDeliveryOrderCents) * 100) : null,
        deliveryRadiusKm: deliveryRadiusKm.trim() ? Number(deliveryRadiusKm) : undefined,
        pickupInstructions: pickupInstructions.trim(),
        operatingHours,
        pickupWindows,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Pickup & Delivery"
        subtitle="How planters get saplings from you"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <BorderCard style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Offer pickup</Text>
              <Text style={styles.toggleBody}>Planters collect saplings from your nursery.</Text>
            </View>
            <Toggle value={offersPickup} onValueChange={setOffersPickup} />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Offer delivery</Text>
              <Text style={styles.toggleBody}>Saplings are delivered to the planter's address.</Text>
            </View>
            <Toggle value={offersDelivery} onValueChange={setOffersDelivery} />
          </View>
        </BorderCard>

        {offersDelivery && (
          <>
            <Text style={styles.sectionTitle}>Delivery details</Text>
            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <FormField label="Delivery fee ₹ (blank = platform default)" value={deliveryFeeCents} onChangeText={setDeliveryFeeCents} placeholder="0" keyboardType="number-pad" />
              </View>
              <View style={styles.inlineField}>
                <FormField label="Min order ₹ (blank = none)" value={minDeliveryOrderCents} onChangeText={setMinDeliveryOrderCents} placeholder="0" keyboardType="number-pad" />
              </View>
            </View>
            <FormField label="Delivery radius (km)" value={deliveryRadiusKm} onChangeText={setDeliveryRadiusKm} placeholder="e.g. 10" keyboardType="number-pad" />
          </>
        )}

        {offersPickup && (
          <>
            <Text style={styles.sectionTitle}>Pickup instructions</Text>
            <FormField
              label="Notes for planters (optional)"
              value={pickupInstructions}
              onChangeText={setPickupInstructions}
              placeholder="e.g. Enter through the side gate, ask for Ramesh"
              multiline
            />

            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>Pickup windows</Text>
              <TouchableOpacity onPress={addWindowRow} style={styles.addRowButton}>
                <Text style={styles.addRowText}>+ Add window</Text>
              </TouchableOpacity>
            </View>
            {pickupWindows.length === 0 && <Text style={styles.emptyRowsText}>No pickup windows set — planters can pick up anytime.</Text>}
            {pickupWindows.map((row, i) => (
              <BorderCard key={i} style={styles.rowCard} noPadding>
                <View style={styles.rowContent}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Label" value={row.label} onChangeText={(v) => updateWindowRow(i, { label: v })} placeholder="Morning" />
                  </View>
                  <View style={{ width: 90 }}>
                    <FormField label="Start" value={row.startTime} onChangeText={(v) => updateWindowRow(i, { startTime: v })} placeholder="09:00" />
                  </View>
                  <View style={{ width: 90 }}>
                    <FormField label="End" value={row.endTime} onChangeText={(v) => updateWindowRow(i, { endTime: v })} placeholder="12:00" />
                  </View>
                  <TouchableOpacity onPress={() => removeWindowRow(i)} style={styles.removeButton}>
                    <Text style={styles.removeIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </BorderCard>
            ))}
          </>
        )}

        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Operating hours</Text>
          <TouchableOpacity onPress={addHourRow} style={styles.addRowButton}>
            <Text style={styles.addRowText}>+ Add day</Text>
          </TouchableOpacity>
        </View>
        {operatingHours.length === 0 && <Text style={styles.emptyRowsText}>No hours set — treated as always open.</Text>}
        {operatingHours.map((row, i) => (
          <BorderCard key={i} style={styles.rowCard} noPadding>
            <View style={styles.rowContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
                {DAY_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => updateHourRow(i, { day: d })}
                    style={[styles.dayChip, row.day === d && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayChipText, row.day === d && styles.dayChipTextActive]}>{DAY_LABEL[d]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ width: 90 }}>
                <FormField label="Opens" value={row.opensAt} onChangeText={(v) => updateHourRow(i, { opensAt: v })} placeholder="09:00" />
              </View>
              <View style={{ width: 90 }}>
                <FormField label="Closes" value={row.closesAt} onChangeText={(v) => updateHourRow(i, { closesAt: v })} placeholder="18:00" />
              </View>
              <TouchableOpacity onPress={() => removeHourRow(i)} style={styles.removeButton}>
                <Text style={styles.removeIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          </BorderCard>
        ))}

        {error && <Text style={styles.errorText}>{error}</Text>}
        {saved && !error && <Text style={styles.savedText}>Saved ✓</Text>}

        <AnimatedButton
          label={updateMutation.isPending ? 'Saving…' : 'Save changes'}
          onPress={guard(handleSave)}
          disabled={updateMutation.isPending}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: 20 }}
        />
      </ScrollView>

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: 4 },
  toggleCard: { gap: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  toggleBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 20, marginBottom: 4 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  addRowButton: { paddingVertical: 6, paddingHorizontal: 4 },
  addRowText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  emptyRowsText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  rowCard: { marginTop: 10, padding: 12 },
  rowContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  dayPicker: { flex: 1, maxWidth: 140 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(94,133,80,0.08)', marginRight: 6, marginBottom: 12 },
  dayChipActive: { backgroundColor: COLORS.forest },
  dayChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  dayChipTextActive: { color: COLORS.white },
  removeButton: { padding: 8, marginBottom: 8 },
  removeIcon: { fontSize: 16 },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 16 },
  savedText: { fontSize: 13, color: COLORS.forest, fontWeight: '700', textAlign: 'center', marginTop: 16 },
});
