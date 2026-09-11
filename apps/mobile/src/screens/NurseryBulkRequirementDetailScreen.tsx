import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { FormField } from '../components/common/FormField';
import { Toggle } from '../components/common/Toggle';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { StatusModal } from '../components/common/StatusModal';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useNurseryBulkRequirement,
  useRespondToBulkRequirement,
  useWithdrawBulkResponse,
  useMarkBulkResponseFulfilled,
  useNurseryProfile,
} from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { ApiError } from '../api/client';

export function NurseryBulkRequirementDetailScreen({ route, navigation }: any) {
  const requirementId: string = route?.params?.requirementId;
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const { data: req, isLoading } = useNurseryBulkRequirement(requirementId);
  const respondMutation = useRespondToBulkRequirement();
  const withdrawMutation = useWithdrawBulkResponse();
  const fulfilledMutation = useMarkBulkResponseFulfilled();
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

  const [quantityOffered, setQuantityOffered] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [canDeliver, setCanDeliver] = useState(true);
  const [canPickup, setCanPickup] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (req?.myResponse) {
      setQuantityOffered(String(req.myResponse.quantityOffered));
      setPriceCents(req.myResponse.priceCents != null ? String(req.myResponse.priceCents / 100) : '');
      setCanDeliver(req.myResponse.canDeliver);
      setCanPickup(req.myResponse.canPickup);
      setMessage(req.myResponse.message ?? '');
    }
  }, [req?.myResponse?.id]);

  const handleRespond = async () => {
    setError(null);
    const qty = Number(quantityOffered);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity to offer.');
      return;
    }
    try {
      await respondMutation.mutateAsync({
        id: requirementId,
        input: {
          quantityOffered: qty,
          priceCents: priceCents.trim() ? Math.round(Number(priceCents) * 100) : undefined,
          canDeliver,
          canPickup,
          message: message.trim() || undefined,
        },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your offer. Please try again.');
    }
  };

  const handleWithdraw = () => {
    if (!req?.myResponse) return;
    confirm('Withdraw your offer?', 'The NGO will no longer see this offer.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: guard(() => withdrawMutation.mutate(req.myResponse!.id)) },
    ]);
  };

  const handleMarkFulfilled = () => {
    if (!req?.myResponse) return;
    confirm('Confirm handoff?', 'This issues traceable sapling units for this order — only confirm once the handoff has actually happened.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm handoff', onPress: guard(() => fulfilledMutation.mutate(req.myResponse!.id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Bulk Requirement" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      {isLoading || !req ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <BorderCard style={styles.card}>
            <Text style={styles.ngoName}>{req.ngo.orgName}</Text>
            <Text style={styles.species}>
              {req.species?.commonName ?? req.speciesNote ?? 'Any species'}
              {req.nativePreferred ? ' · Native preferred' : ''}
            </Text>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Needed</Text>
              <Text style={styles.summaryValue}>{req.quantityNeeded}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fulfilled so far</Text>
              <Text style={styles.summaryValue}>{req.quantityFulfilled}</Text>
            </View>
            {req.neededByDate && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Needed by</Text>
                <Text style={styles.summaryValue}>{new Date(req.neededByDate).toLocaleDateString()}</Text>
              </View>
            )}
            {req.city && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>City</Text>
                <Text style={styles.summaryValue}>{req.city}{req.distanceKm != null ? ` · ${req.distanceKm.toFixed(1)} km away` : ''}</Text>
              </View>
            )}
            {req.notes && <Text style={styles.notes}>{req.notes}</Text>}
          </BorderCard>

          {req.myResponse && req.myResponse.status !== 'withdrawn' && req.myResponse.status !== 'declined' ? (
            <>
              <Text style={styles.sectionTitle}>Your offer</Text>
              <BorderCard style={styles.card}>
                <View style={[styles.statusPill, pillColor(req.myResponse.status)]}>
                  <Text style={styles.statusPillText}>{req.myResponse.status}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Offered</Text>
                  <Text style={styles.summaryValue}>{req.myResponse.quantityOffered}</Text>
                </View>
                {req.myResponse.priceCents != null && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Price</Text>
                    <Text style={styles.summaryValue}>₹{(req.myResponse.priceCents / 100).toFixed(0)}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fulfilment</Text>
                  <Text style={styles.summaryValue}>
                    {[req.myResponse.canPickup && 'Pickup', req.myResponse.canDeliver && 'Delivery'].filter(Boolean).join(' + ') || '—'}
                  </Text>
                </View>

                {req.myResponse.status === 'proposed' && (
                  <TouchableOpacity onPress={handleWithdraw} style={styles.linkButton}>
                    <Text style={styles.linkButtonDanger}>Withdraw offer</Text>
                  </TouchableOpacity>
                )}
                {req.myResponse.status === 'accepted' && (
                  <AnimatedButton
                    label={fulfilledMutation.isPending ? 'Confirming…' : 'Confirm handoff (mark fulfilled)'}
                    onPress={handleMarkFulfilled}
                    disabled={fulfilledMutation.isPending}
                    variant="primary"
                    size="md"
                    fullWidth
                    style={{ marginTop: 10 }}
                  />
                )}
              </BorderCard>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{req.myResponse ? 'Send a new offer' : 'Respond with an offer'}</Text>
              <View style={styles.inlineRow}>
                <View style={styles.inlineField}>
                  <FormField label="Quantity offered" value={quantityOffered} onChangeText={setQuantityOffered} placeholder="0" keyboardType="number-pad" />
                </View>
                <View style={styles.inlineField}>
                  <FormField label="Price ₹ (optional)" value={priceCents} onChangeText={setPriceCents} placeholder="0" keyboardType="number-pad" />
                </View>
              </View>
              <BorderCard style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Can deliver</Text>
                  <Toggle value={canDeliver} onValueChange={setCanDeliver} />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Can pickup</Text>
                  <Toggle value={canPickup} onValueChange={setCanPickup} />
                </View>
              </BorderCard>
              <FormField label="Message (optional)" value={message} onChangeText={setMessage} placeholder="Anything the NGO should know" multiline />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <AnimatedButton
                label={respondMutation.isPending ? 'Sending…' : 'Send offer'}
                onPress={guard(handleRespond)}
                disabled={respondMutation.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </ScrollView>
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

function pillColor(status: string) {
  if (status === 'accepted' || status === 'fulfilled') return { backgroundColor: 'rgba(94,133,80,0.15)' };
  if (status === 'declined' || status === 'withdrawn') return { backgroundColor: 'rgba(194,74,59,0.12)' };
  return { backgroundColor: 'rgba(212,168,83,0.18)' };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: 4 },
  card: { marginBottom: 16 },
  ngoName: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  species: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  notes: { fontSize: 13, color: COLORS.textPrimary, marginTop: 10, lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  toggleCard: { gap: 4, marginTop: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 12 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  linkButton: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  linkButtonDanger: { fontSize: 13, fontWeight: '700', color: COLORS.dangerDark },
});
