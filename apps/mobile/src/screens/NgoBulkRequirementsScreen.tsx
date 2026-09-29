import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, TextInput } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useNgoBulkRequirements,
  useNgoBulkRequirement,
  useCreateNgoBulkRequirement,
  useCancelNgoBulkRequirement,
  useRescheduleNgoBulkRequirement,
  useAcceptNgoBulkResponse,
  useDeclineNgoBulkResponse,
  useConfirmNgoBulkResponseReceived,
  useSpecies,
  useCreateSpecies,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiNgoBulkRequirement } from '../api/ngoBulkRequirements';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { isBulkRequirementOverdue } from '../utils/bulkRequirement';
import { reverseGeocode } from '../api/geocode';
import { SPECIES_EMOJI_OPTIONS } from '../api/species';
import { fuzzyMatch } from '../utils/fuzzyMatch';

function RequirementCard({ item, onPress }: { item: ApiNgoBulkRequirement; onPress: () => void }) {
  const overdue = isBulkRequirementOverdue(item);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <BorderCard style={styles.row}>
        <Text style={styles.species}>{item.species?.commonName ?? item.speciesNote ?? 'Any species'}</Text>
        <Text style={styles.meta}>
          {item.quantityFulfilled}/{item.quantityNeeded} fulfilled
          {item.neededByDate ? (
            <Text style={overdue ? styles.metaOverdue : undefined}> · Needed by {new Date(item.neededByDate).toLocaleDateString()}</Text>
          ) : null}
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
  const rescheduleMutation = useRescheduleNgoBulkRequirement();
  const acceptMutation = useAcceptNgoBulkResponse();
  const declineMutation = useDeclineNgoBulkResponse();
  const confirmReceivedMutation = useConfirmNgoBulkResponseReceived();
  const confirm = useConfirm();
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);

  useEffect(() => {
    setRescheduleDate(null);
    setShowReschedulePicker(false);
  }, [id]);

  return (
    <Sheet visible={!!id} onClose={onClose} title="Requirement" scrollable maxHeight={560}>
      {isLoading || !req ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={styles.sheetSpecies}>{req.species?.commonName ?? req.speciesNote ?? 'Any species'}</Text>
          <Text style={styles.sheetMeta}>
            {req.quantityFulfilled}/{req.quantityNeeded} fulfilled
            {req.neededByDate ? (
              <Text style={isBulkRequirementOverdue(req) ? styles.metaOverdue : undefined}> · Needed by {new Date(req.neededByDate).toLocaleDateString()}</Text>
            ) : null}
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
                  {r.quantityOffered} offered
                  {r.priceCents != null
                    ? ` · ₹${(r.priceCents / 100).toFixed(0)} each · ₹${((r.priceCents * r.quantityOffered) / 100).toLocaleString('en-IN')} total`
                    : ' · Free'}
                  {' · '}{[r.canPickup && 'Pickup', r.canDeliver && 'Delivery'].filter(Boolean).join(' + ') || '—'}
                </Text>
                {r.message ? <Text style={styles.offerMessage}>{r.message}</Text> : null}
                <View style={[styles.statusBadge, badgeColor(r.status)]}>
                  <Text style={[styles.statusBadgeText, { color: COLORS.textPrimary }]}>{r.status}</Text>
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
                {r.status === 'handed_off' && (
                  <View style={styles.confirmReceiptRow}>
                    <Text style={styles.offerMessage}>
                      Ask the nursery for their handoff code, then enter it below to confirm you received the saplings.
                    </Text>
                    <FormField
                      label="Handoff code"
                      value={codeDrafts[r.id] ?? ''}
                      onChangeText={(v) => setCodeDrafts((prev) => ({ ...prev, [r.id]: v }))}
                      placeholder="eg - 1234"
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() => confirmReceivedMutation.mutate({ responseId: r.id, code: (codeDrafts[r.id] ?? '').trim() })}
                      style={styles.offerAcceptButton}
                      disabled={confirmReceivedMutation.isPending}
                    >
                      <Text style={styles.offerAcceptText}>{confirmReceivedMutation.isPending ? 'Confirming…' : 'Confirm receipt'}</Text>
                    </TouchableOpacity>
                    {confirmReceivedMutation.isError && (
                      <Text style={styles.errorText}>{confirmReceivedMutation.error instanceof ApiError ? confirmReceivedMutation.error.message : 'Could not confirm receipt.'}</Text>
                    )}
                  </View>
                )}
              </BorderCard>
            ))
          )}

          {req.status === 'expired' && (
            <View style={styles.rescheduleBox}>
              <Text style={styles.rescheduleHint}>This requirement's deadline passed without being fulfilled. Pick a new date to reopen it to nurseries.</Text>
              <TouchableOpacity onPress={() => setShowReschedulePicker(true)} activeOpacity={0.7}>
                <Text style={[styles.dateValue, !rescheduleDate && styles.datePlaceholder]}>
                  {rescheduleDate
                    ? rescheduleDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Select a new date'}
                </Text>
              </TouchableOpacity>
              {showReschedulePicker && (
                <DateTimePicker
                  value={rescheduleDate ?? new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event, date) => {
                    if (Platform.OS !== 'ios') setShowReschedulePicker(false);
                    if (date) setRescheduleDate(date);
                  }}
                />
              )}
              {Platform.OS === 'ios' && showReschedulePicker && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowReschedulePicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => rescheduleDate && rescheduleMutation.mutate({ id: req.id, neededByDate: rescheduleDate.toISOString() })}
                style={styles.offerAcceptButton}
                disabled={!rescheduleDate || rescheduleMutation.isPending}
              >
                <Text style={styles.offerAcceptText}>{rescheduleMutation.isPending ? 'Rescheduling…' : 'Reschedule'}</Text>
              </TouchableOpacity>
              {rescheduleMutation.isError && (
                <Text style={styles.errorText}>{rescheduleMutation.error instanceof ApiError ? rescheduleMutation.error.message : 'Could not reschedule this requirement.'}</Text>
              )}
            </View>
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

export function NgoBulkRequirementsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { data: requirements = [], isLoading, refetch } = useNgoBulkRequirements();
  const createMutation = useCreateNgoBulkRequirement();
  const { data: speciesCatalog = [] } = useSpecies();
  const createSpeciesMutation = useCreateSpecies();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deep-linked from a tapped notification (e.g. bulk_requirement_deadline_passed) straight into
  // that requirement's detail sheet, the same param-driven pre-selection pattern other screens use
  // (e.g. NgoLogPlantedTrees' driveId param).
  useEffect(() => {
    const id = route?.params?.openRequirementId;
    if (id) setSelectedId(id);
  }, [route?.params?.openRequirementId]);
  // Linking to a catalog species (rather than just free text below) is what lets nurseries'
  // stock get checked against this request — see bulkRequirement.service.ts's respondToRequirement,
  // which only gates on quantity when requirement.speciesId is set.
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [showSpeciesResults, setShowSpeciesResults] = useState(false);
  const [showAddSpecies, setShowAddSpecies] = useState(false);
  const [newSpeciesEmoji, setNewSpeciesEmoji] = useState<string | null>(null);
  const [speciesNote, setSpeciesNote] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [neededByDate, setNeededByDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fuzzy (not just substring) so a typo or near-miss spelling ("roze", "gulmohr") still surfaces
  // the existing catalog entry instead of nudging the NGO toward adding a near-duplicate.
  const speciesMatches = useMemo(
    () => fuzzyMatch(speciesQuery, speciesCatalog, (s) => s.commonName),
    [speciesQuery, speciesCatalog],
  );

  const handleAddSpecies = async () => {
    const commonName = speciesQuery.trim();
    if (!commonName || !newSpeciesEmoji) return;
    setError(null);
    try {
      const created = await createSpeciesMutation.mutateAsync({ commonName, emoji: newSpeciesEmoji });
      setSpeciesId(created.id);
      setSpeciesQuery('');
      setNewSpeciesEmoji(null);
      setShowAddSpecies(false);
      setShowSpeciesResults(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add that species. Please try again.");
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocationNotice(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to capture where this requirement should be delivered.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ lat, lng });
      const found = await reverseGeocode(lat, lng).catch(() => null);
      if (found) {
        setAddress(found.label);
        setLocationNotice({ ok: true, text: '✓ Matched from GPS — check the address above is correct' });
      } else {
        setLocationNotice({ ok: false, text: "Pin captured, but we couldn't find an address for it — the coordinates are still saved" });
      }
    } catch {
      setError("Couldn't get your location. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    const qty = Number(quantityNeeded);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity needed.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        speciesId: speciesId ?? undefined,
        speciesNote: speciesNote.trim() || undefined,
        quantityNeeded: qty,
        neededByDate: neededByDate ? neededByDate.toISOString() : undefined,
        city: city.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        notes: notes.trim() || undefined,
      });
      setSpeciesId(null);
      setSpeciesQuery('');
      setShowAddSpecies(false);
      setNewSpeciesEmoji(null);
      setSpeciesNote('');
      setQuantityNeeded('');
      setNeededByDate(null);
      setCity('');
      setAddress('');
      setCoords(null);
      setLocationNotice(null);
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
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {requirements.map((r) => (
            <RequirementCard key={r.id} item={r} onPress={() => setSelectedId(r.id)} />
          ))}
        </ScrollView>
      )}

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="New bulk requirement" scrollable maxHeight={560}>
        <View style={{ gap: 4 }}>
          <Text style={styles.formLabel}>Species (optional)</Text>
          {speciesId ? (
            <View style={styles.selectedSpeciesRow}>
              <Text style={styles.selectedSpeciesText}>
                {speciesCatalog.find((s) => s.id === speciesId)?.emoji} {speciesCatalog.find((s) => s.id === speciesId)?.commonName}
              </Text>
              <TouchableOpacity onPress={() => setSpeciesId(null)}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                value={speciesQuery}
                onChangeText={(v) => {
                  setSpeciesQuery(v);
                  setShowSpeciesResults(true);
                }}
                onFocus={() => setShowSpeciesResults(true)}
                placeholder="eg - Search catalog species, Neem"
                placeholderTextColor={COLORS.textLight}
              />
              {!showAddSpecies && showSpeciesResults && speciesMatches.length > 0 && (
                <View style={styles.resultsList}>
                  {speciesMatches.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.resultRow}
                      onPress={() => {
                        setSpeciesId(s.id);
                        setShowSpeciesResults(false);
                      }}
                    >
                      <Text style={styles.resultText}>{s.emoji} {s.commonName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  setShowAddSpecies((prev) => !prev);
                  setShowSpeciesResults(false);
                }}
                style={styles.addSpeciesToggle}
              >
                <Text style={styles.addSpeciesToggleText}>
                  {showAddSpecies ? '✕ Cancel' : "Can't find it? Add it to the catalog"}
                </Text>
              </TouchableOpacity>
              {showAddSpecies && (
                <View style={styles.inlineSpeciesBlock}>
                  <Text style={styles.formLabel}>
                    Adding "{speciesQuery.trim() || '…'}" — edit the name in the search box above, then pick an emoji
                  </Text>
                  <View style={styles.emojiGrid}>
                    {SPECIES_EMOJI_OPTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.emojiChip, newSpeciesEmoji === emoji && styles.emojiChipSelected]}
                        onPress={() => setNewSpeciesEmoji(emoji)}
                      >
                        <Text style={styles.emojiChipText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <AnimatedButton
                    label={createSpeciesMutation.isPending ? 'Adding…' : `Add "${speciesQuery.trim() || '…'}" to the catalog`}
                    onPress={handleAddSpecies}
                    variant="secondary"
                    size="md"
                    fullWidth
                    disabled={!speciesQuery.trim() || !newSpeciesEmoji || createSpeciesMutation.isPending}
                  />
                </View>
              )}
            </>
          )}
          <Text style={styles.fieldHint}>
            Matching a catalog species lets nurseries' existing stock be checked when they respond — leave blank for open-ended asks like "any native species".
          </Text>
          <FormField label="Additional description (optional)" value={speciesNote} onChangeText={setSpeciesNote} placeholder="eg - Native shade trees" />
          <FormField label="Quantity needed" value={quantityNeeded} onChangeText={setQuantityNeeded} placeholder="eg - 0" keyboardType="number-pad" />
          <FormFieldShell label="Needed by (optional)">
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={[styles.dateValue, !neededByDate && styles.datePlaceholder]}>
                {neededByDate
                  ? neededByDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Select a date'}
              </Text>
            </TouchableOpacity>
          </FormFieldShell>
          {neededByDate && (
            <TouchableOpacity onPress={() => setNeededByDate(null)} style={styles.clearDateBtn}>
              <Text style={styles.clearDateText}>Clear date</Text>
            </TouchableOpacity>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={neededByDate ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, date) => {
                // Android's dialog dismisses itself; iOS's spinner stays until told otherwise.
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (date) setNeededByDate(date);
              }}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
          <AddressSearchField
            label="Delivery address (optional)"
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setCoords(null);
              setLocationNotice(null);
            }}
            placeholder="Street / area / landmark"
            onSelectSuggestion={(s) => {
              setCoords({ lat: s.lat, lng: s.lng });
              setLocationNotice(null);
            }}
          />
          <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}>
            <Text style={styles.locationButtonText}>{locating ? 'Locating…' : '📍 Or use my current location'}</Text>
          </TouchableOpacity>
          {locationNotice && (
            <Text style={[styles.locationNoticeText, locationNotice.ok ? styles.locationNoticeOk : styles.locationNoticeWarn]}>
              {locationNotice.text}
            </Text>
          )}
          <CityPickerField label="City (optional)" value={city} onChange={setCity} />
          <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="eg - Anything nurseries should know" multiline />
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
  formLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 },
  searchInput: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  resultsList: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    marginTop: 4,
    overflow: 'hidden',
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.15)' },
  resultText: { fontSize: 14, color: COLORS.textPrimary },
  selectedSpeciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(94,133,80,0.08)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedSpeciesText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  changeLink: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  fieldHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, marginBottom: 4, lineHeight: 15 },
  addSpeciesToggle: { marginTop: 8, paddingVertical: 4 },
  addSpeciesToggleText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  inlineSpeciesBlock: { marginTop: 8, gap: 10 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
  },
  emojiChipSelected: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  emojiChipText: { fontSize: 18 },
  newButton: { paddingHorizontal: 10, paddingVertical: 8 },
  newButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  list: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  row: { marginBottom: 10 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  metaOverdue: { color: COLORS.dangerDark, fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 4 },
  dateValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600', paddingVertical: 2 },
  datePlaceholder: { color: COLORS.textLight, fontWeight: '500' },
  clearDateBtn: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 4, marginTop: -6 },
  clearDateText: { fontSize: 12, fontWeight: '700', color: COLORS.coral },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6 },
  doneText: { fontSize: 14, fontWeight: '800', color: COLORS.forest },
  locationButton: { paddingVertical: 6, marginBottom: 4 },
  locationButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  locationNoticeText: { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  locationNoticeOk: { color: COLORS.forest },
  locationNoticeWarn: { color: COLORS.golden },
  sheetSpecies: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  sheetMeta: { fontSize: 13, color: COLORS.textSecondary },
  sheetNotes: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  sheetSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  sheetEmpty: { fontSize: 13, color: COLORS.textMuted },
  rescheduleBox: { gap: 8, padding: 12, borderRadius: RADIUS.md, backgroundColor: 'rgba(194,74,59,0.08)' },
  rescheduleHint: { fontSize: 12, color: COLORS.textPrimary },
  offerCard: { gap: 4 },
  offerNursery: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  offerMeta: { fontSize: 12, color: COLORS.textSecondary },
  offerMessage: { fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  confirmReceiptRow: { gap: 6, marginTop: 6 },
  offerAcceptButton: { flex: 1, backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center' },
  offerAcceptText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  offerDeclineButton: { flex: 1, borderWidth: 1.5, borderColor: COLORS.dangerDark, borderRadius: RADIUS.md, paddingVertical: 8, alignItems: 'center' },
  offerDeclineText: { fontSize: 12, fontWeight: '700', color: COLORS.dangerDark },
  cancelLink: { alignItems: 'center', paddingVertical: 10 },
  cancelLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.dangerDark },
});
