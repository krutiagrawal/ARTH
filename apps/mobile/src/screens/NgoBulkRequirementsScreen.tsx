import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useNgoBulkRequirements,
  useNgoBulkRequirement,
  useCreateNgoBulkRequirement,
  useCancelNgoBulkRequirement,
  useAcceptNgoBulkResponse,
  useDeclineNgoBulkResponse,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiNgoBulkRequirement } from '../api/ngoBulkRequirements';

function RequirementCard({ item, onPress }: { item: ApiNgoBulkRequirement; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard style={styles.row}>
        <Text style={styles.species}>{item.species?.commonName ?? item.speciesNote ?? 'Any species'}</Text>
        <Text style={styles.meta}>
          {item.quantityFulfilled}/{item.quantityNeeded} fulfilled
          {item.neededByDate ? ` · Needed by ${new Date(item.neededByDate).toLocaleDateString()}` : ''}
        </Text>
        <View style={[styles.statusBadge, badgeColor(item.status)]}>
          <Text style={styles.statusBadgeText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

function badgeColor(status: string) {
  if (status === 'fulfilled') return { backgroundColor: 'rgba(94,133,80,0.15)' };
  if (status === 'cancelled' || status === 'expired') return { backgroundColor: 'rgba(194,74,59,0.12)' };
  return { backgroundColor: 'rgba(212,168,83,0.18)' };
}

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: req, isLoading } = useNgoBulkRequirement(id);
  const cancelMutation = useCancelNgoBulkRequirement();
  const acceptMutation = useAcceptNgoBulkResponse();
  const declineMutation = useDeclineNgoBulkResponse();
  const confirm = useConfirm();

  return (
    <Sheet visible={!!id} onClose={onClose} title="Requirement" scrollable maxHeight={560}>
      {isLoading || !req ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={styles.sheetSpecies}>{req.species?.commonName ?? req.speciesNote ?? 'Any species'}</Text>
          <Text style={styles.sheetMeta}>
            {req.quantityFulfilled}/{req.quantityNeeded} fulfilled
            {req.neededByDate ? ` · Needed by ${new Date(req.neededByDate).toLocaleDateString()}` : ''}
          </Text>
          {req.notes ? <Text style={styles.sheetNotes}>{req.notes}</Text> : null}

          <Text style={styles.sheetSectionTitle}>Nursery offers</Text>
          {!req.responses || req.responses.length === 0 ? (
            <Text style={styles.sheetEmpty}>No offers yet.</Text>
          ) : (
            req.responses.map((r) => (
              <BorderCard key={r.id} style={styles.offerCard}>
                <Text style={styles.offerNursery}>{r.nursery.nurseryName}</Text>
                <Text style={styles.offerMeta}>
                  {r.quantityOffered} offered{r.priceCents != null ? ` · ₹${(r.priceCents / 100).toFixed(0)}` : ' · Free'}
                  {' · '}{[r.canPickup && 'Pickup', r.canDeliver && 'Delivery'].filter(Boolean).join(' + ') || '—'}
                </Text>
                {r.message ? <Text style={styles.offerMessage}>{r.message}</Text> : null}
                <View style={[styles.statusBadge, badgeColor(r.status)]}>
                  <Text style={styles.statusBadgeText}>{r.status}</Text>
                </View>
                {r.status === 'proposed' && (
                  <View style={styles.offerActions}>
                    <TouchableOpacity onPress={() => acceptMutation.mutate(r.id)} style={styles.offerAcceptButton}>
                      <Text style={styles.offerAcceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => declineMutation.mutate(r.id)} style={styles.offerDeclineButton}>
                      <Text style={styles.offerDeclineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </BorderCard>
            ))
          )}

          {req.status !== 'cancelled' && req.status !== 'fulfilled' && (
            <TouchableOpacity
              onPress={() =>
                confirm('Cancel this requirement?', 'Nurseries will no longer be able to respond.', [
                  { text: 'Back', style: 'cancel' },
                  { text: 'Cancel requirement', style: 'destructive', onPress: () => cancelMutation.mutate(req.id) },
                ])
              }
              style={styles.cancelLink}
            >
              <Text style={styles.cancelLinkText}>Cancel this requirement</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Sheet>
  );
}

export function NgoBulkRequirementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: requirements = [], isLoading } = useNgoBulkRequirements();
  const createMutation = useCreateNgoBulkRequirement();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speciesNote, setSpeciesNote] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const qty = Number(quantityNeeded);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity needed.');
      return;
    }
    // The backend requires a full ISO 8601 datetime (z.string().datetime()) — the field only
    // collects a plain date, so midnight UTC on that date is what actually goes over the wire.
    let neededByIso: string | undefined;
    if (neededByDate.trim()) {
      const parsed = new Date(`${neededByDate.trim()}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        setError('Enter the date as YYYY-MM-DD.');
        return;
      }
      neededByIso = parsed.toISOString();
    }
    try {
      await createMutation.mutateAsync({
        speciesNote: speciesNote.trim() || undefined,
        quantityNeeded: qty,
        neededByDate: neededByIso,
        city: city.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSpeciesNote('');
      setQuantityNeeded('');
      setNeededByDate('');
      setCity('');
      setNotes('');
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post this requirement. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Bulk Requirements"
        subtitle="Ask nurseries for saplings at scale"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
        right={
          <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.newButton}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : requirements.length === 0 ? (
        <EmptyState icon="🤝" title="No requirements yet" body="Post one to ask nurseries nearby for bulk saplings." actionLabel="Post a requirement" onAction={() => setShowCreate(true)} />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {requirements.map((r) => (
            <RequirementCard key={r.id} item={r} onPress={() => setSelectedId(r.id)} />
          ))}
        </ScrollView>
      )}

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="New bulk requirement" scrollable maxHeight={560}>
        <View style={{ gap: 4 }}>
          <FormField label="Species (optional description)" value={speciesNote} onChangeText={setSpeciesNote} placeholder="e.g. Native shade trees" />
          <FormField label="Quantity needed" value={quantityNeeded} onChangeText={setQuantityNeeded} placeholder="0" keyboardType="number-pad" />
          <FormField label="Needed by (YYYY-MM-DD, optional)" value={neededByDate} onChangeText={setNeededByDate} placeholder="2026-10-01" />
          <FormField label="City (optional)" value={city} onChangeText={setCity} placeholder="e.g. Pune" />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything nurseries should know" multiline />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <AnimatedButton
            label={createMutation.isPending ? 'Posting…' : 'Post requirement'}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Sheet>

      <DetailSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  newButton: { paddingHorizontal: 10, paddingVertical: 8 },
  newButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  list: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  row: { marginBottom: 10 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 4 },
  sheetSpecies: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  sheetMeta: { fontSize: 13, color: COLORS.textSecondary },
  sheetNotes: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  sheetSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  sheetEmpty: { fontSize: 13, color: COLORS.textMuted },
  offerCard: { gap: 4 },
  offerNursery: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  offerMeta: { fontSize: 12, color: COLORS.textSecondary },
  offerMessage: { fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  offerAcceptButton: { flex: 1, backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center' },
  offerAcceptText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  offerDeclineButton: { flex: 1, borderWidth: 1.5, borderColor: COLORS.dangerDark, borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center' },
  offerDeclineText: { fontSize: 12, fontWeight: '700', color: COLORS.dangerDark },
  cancelLink: { alignItems: 'center', paddingVertical: 10 },
  cancelLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.dangerDark },
});
