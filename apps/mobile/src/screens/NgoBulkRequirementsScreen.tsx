import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
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
  useUpdateNgoBulkRequirement,
  useCancelNgoBulkRequirement,
  useRescheduleNgoBulkRequirement,
  useAcceptNgoBulkResponse,
  useDeclineNgoBulkResponse,
  useConfirmNgoBulkResponseReceived,
  useSpecies,
  useCreateSpecies,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiNgoBulkRequirement, ApiNgoBulkResponse, RequirementFilter, RequirementSort, UpdateNgoBulkRequirementInput } from '../api/ngoBulkRequirements';
import { BulkRequirementCard, STATUS_STYLE, deadlineInfo, requirementTitle } from '../components/ngo/BulkRequirementCard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { isBulkRequirementOverdue } from '../utils/bulkRequirement';
import { reverseGeocode } from '../api/geocode';
import { SPECIES_EMOJI_OPTIONS } from '../api/species';
import { fuzzyMatch } from '../utils/fuzzyMatch';

import { TEXT } from '../constants/typography';
import { useRequireApproval } from '../hooks/useRequireApproval';
function badgeColor(status: string) {
  if (status === 'fulfilled') return { backgroundColor: 'rgba(94,133,80,0.15)' };
  if (status === 'cancelled' || status === 'expired') return { backgroundColor: 'rgba(194,74,59,0.12)' };
  return { backgroundColor: 'rgba(212,168,83,0.18)' };
}

function DetailSheet({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (req: ApiNgoBulkRequirement) => void }) {
  const guard = useRequireApproval();
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

  // Accepting commits the NGO to that quantity and price, and declining can't be taken back - so both ask first.
  const confirmAccept = (r: ApiNgoBulkResponse) => {
    const total = r.priceCents != null ? ` for ₹${((r.priceCents * r.quantityOffered) / 100).toLocaleString('en-IN')}` : ' free of charge';
    confirm(
      'Accept this offer?',
      `${r.nursery.nurseryName} will supply ${r.quantityOffered.toLocaleString('en-IN')} saplings${total}. They'll be told straight away and will arrange the handoff.`,
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Accept offer', onPress: guard(() => acceptMutation.mutate(r.id)) },
      ],
    );
  };

  const confirmDecline = (r: ApiNgoBulkResponse) => {
    confirm(
      'Decline this offer?',
      `${r.nursery.nurseryName} will be told their offer of ${r.quantityOffered.toLocaleString('en-IN')} saplings was declined. This can't be undone.`,
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Decline offer', style: 'destructive', onPress: guard(() => declineMutation.mutate(r.id)) },
      ],
    );
  };

  return (
    <Sheet visible={!!id} onClose={onClose} title="Requirement" scrollable maxHeight={560}>
      {isLoading || !req ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 12 }}>
          <View style={styles.sheetHead}>
            <View style={styles.sheetEmojiTile}>
              <Text style={{ fontSize: 26 }}>{req.species?.emoji ?? '🌱'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetSpecies}>{requirementTitle(req)}</Text>
              {req.species && req.speciesNote ? <Text style={styles.sheetMeta}>{req.speciesNote}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${(STATUS_STYLE[req.status] ?? STATUS_STYLE.open).color}26`, marginTop: 0 }]}>
              <Text style={[styles.statusBadgeText, { color: (STATUS_STYLE[req.status] ?? STATUS_STYLE.open).color }]}>
                {(STATUS_STYLE[req.status] ?? STATUS_STYLE.open).label}
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.sheetProgressHead}>
              <Text style={styles.sheetMeta}>
                <Text style={styles.sheetQtyStrong}>{req.quantityFulfilled.toLocaleString('en-IN')}</Text> of {req.quantityNeeded.toLocaleString('en-IN')} received
              </Text>
              <Text style={styles.sheetPercent}>{req.quantityNeeded ? Math.min(100, Math.round((req.quantityFulfilled / req.quantityNeeded) * 100)) : 0}%</Text>
            </View>
            <View style={styles.sheetTrack}>
              <View style={[styles.sheetFill, { width: `${req.quantityNeeded ? Math.min(100, Math.round((req.quantityFulfilled / req.quantityNeeded) * 100)) : 0}%` }]} />
            </View>
          </View>

          <View style={styles.factGrid}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Still needed</Text>
              <Text style={styles.factValue}>{Math.max(req.quantityNeeded - req.quantityFulfilled, 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Needed by</Text>
              <Text style={[styles.factValue, deadlineInfo(req)?.urgent && { color: COLORS.coral }]}>
                {req.neededByDate ? new Date(req.neededByDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}
              </Text>
              {deadlineInfo(req) ? <Text style={[styles.factSub, deadlineInfo(req)!.urgent && { color: COLORS.coral }]}>{deadlineInfo(req)!.text}</Text> : null}
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Deliver to</Text>
              <Text style={styles.factValue}>{req.city ?? 'Not set'}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Posted</Text>
              <Text style={styles.factValue}>{new Date(req.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            {req.nativePreferred ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>🌿 Native species preferred</Text>
              </View>
            ) : null}
            {req.drive ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>🌳 For drive: {req.drive.title}</Text>
              </View>
            ) : null}
          </View>

          {req.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.factLabel}>Notes</Text>
              <Text style={styles.sheetNotes}>{req.notes}</Text>
            </View>
          ) : null}

          {['open', 'partially_fulfilled'].includes(req.status) && (
            <TouchableOpacity style={styles.editButton} onPress={guard(() => onEdit(req))} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.editButtonText}>✏️  Edit requirement</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sheetSectionTitle}>Nursery offers{req.responses?.length ? ` (${req.responses.length})` : ''}</Text>
          {!req.responses || req.responses.length === 0 ? (
            <Text style={styles.sheetEmpty}>No offers yet.</Text>
          ) : (
            req.responses.map((r) => (
              <BorderCard key={r.id} style={styles.offerCard}>
                <Text style={styles.offerNursery}>{r.nursery.nurseryName}</Text>
                {r.nursery.city || r.nursery.avgRating ? (
                  <Text style={styles.offerMeta}>
                    {r.nursery.city ? `📍 ${r.nursery.city}` : ''}
                    {r.nursery.city && r.nursery.avgRating ? '  ·  ' : ''}
                    {r.nursery.avgRating ? `⭐ ${Number(r.nursery.avgRating).toFixed(1)}` : ''}
                    {`  ·  Offered ${new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                  </Text>
                ) : null}
                <Text style={styles.offerMeta}>
                  {r.quantityOffered} offered
                  {r.priceCents != null
                    ? ` · ₹${(r.priceCents / 100).toFixed(0)} each · ₹${((r.priceCents * r.quantityOffered) / 100).toLocaleString('en-IN')} total`
                    : ' · Free'}
                  {' · '}{[r.canPickup && 'Pickup', r.canDeliver && 'Delivery'].filter(Boolean).join(' + ') || '–'}
                </Text>
                {r.message ? <Text style={styles.offerMessage}>{r.message}</Text> : null}
                <View style={[styles.statusBadge, badgeColor(r.status)]}>
                  <Text style={[styles.statusBadgeText, { color: COLORS.textPrimary }]}>{r.status}</Text>
                </View>
                {r.status === 'proposed' && (
                  <View style={styles.offerActions}>
                    <TouchableOpacity onPress={() => confirmAccept(r)} style={styles.offerAcceptButton}>
                      <Text style={styles.offerAcceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDecline(r)} style={styles.offerDeclineButton}>
                      <Text style={styles.offerDeclineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {r.status === 'handed_off' && (
                  <View style={styles.confirmReceiptRow}>
                    <Text style={styles.offerMessage}>
                      Ask the nursery for their handoff code, then enter it below to confirm you received the saplings.
                    </Text>
                    <FormField maxLength={20}
                      required label="Handoff code"
                      value={codeDrafts[r.id] ?? ''}
                      onChangeText={(v) => setCodeDrafts((prev) => ({ ...prev, [r.id]: v }))}
                      placeholder="eg - 1234"
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={guard(() => confirmReceivedMutation.mutate({ responseId: r.id, code: (codeDrafts[r.id] ?? '').trim() }))}
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
              <TouchableOpacity onPress={guard(() => setShowReschedulePicker(true))} activeOpacity={0.7}>
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
                onPress={guard(() => rescheduleDate && rescheduleMutation.mutate({ id: req.id, neededByDate: rescheduleDate.toISOString() }))}
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
                  { text: 'Cancel requirement', style: 'destructive', onPress: guard(() => cancelMutation.mutate(req.id)) },
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

const REQUIREMENT_FILTERS: { key: RequirementFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'open', label: 'Open' },
  { key: 'partially_fulfilled', label: 'Partly filled' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
];

const REQUIREMENT_SORTS: { key: RequirementSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'deadline', label: 'Deadline (soonest)' },
  { key: 'biggest', label: 'Largest quantity' },
];

export function NgoBulkRequirementsScreen({ navigation, route }: any) {
  const guard = useRequireApproval();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [filter, setFilter] = useState<RequirementFilter>('all');
  const [sort, setSort] = useState<RequirementSort>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const listQuery = useNgoBulkRequirements({ search: debouncedSearch, filter, sort });
  const { data, isLoading, isFetching, refetch } = listQuery;
  const requirements = data?.items ?? [];
  const counts = data?.counts;
  const isFiltering = !!debouncedSearch || filter !== 'all';
  const activeFilterCount = (filter !== 'all' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
  const clearAll = () => {
    setSearchText('');
    setFilter('all');
  };
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
  // stock get checked against this request – see bulkRequirement.service.ts's respondToRequirement,
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
  // Set while the form is editing an existing requirement instead of creating one.
  const [editing, setEditing] = useState<ApiNgoBulkRequirement | null>(null);
  const updateMutation = useUpdateNgoBulkRequirement();
  const confirm = useConfirm();

  // Offers limit what may change: nobody should be able to pull the species or quantity out from
  // under a nursery that has already priced an offer (the server enforces the same rules).
  const liveOffers = (editing?.responses ?? []).filter((r) => ['proposed', 'accepted', 'handed_off', 'fulfilled'].includes(r.status));
  const pendingOffers = (editing?.responses ?? []).filter((r) => r.status === 'proposed');
  const promisedQty = (editing?.responses ?? []).filter((r) => ['accepted', 'handed_off', 'fulfilled'].includes(r.status)).reduce((n, r) => n + r.quantityOffered, 0);
  const speciesLocked = !!editing && liveOffers.length > 0;
  const minQuantity = editing ? Math.max(editing.quantityFulfilled, promisedQty, pendingOffers.length > 0 ? editing.quantityNeeded : 0) : 0;

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
        setLocationNotice({ ok: true, text: '✓ Matched from GPS – check the address above is correct' });
      } else {
        setLocationNotice({ ok: false, text: "Pin captured, but we couldn't find an address for it – the coordinates are still saved" });
      }
    } catch {
      setError("Couldn't get your location. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
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
    setError(null);
  };

  const startEdit = (req: ApiNgoBulkRequirement) => {
    resetForm();
    setSelectedId(null);
    setEditing(req);
    setSpeciesId(req.speciesId);
    setSpeciesNote(req.speciesNote ?? '');
    setQuantityNeeded(String(req.quantityNeeded));
    setNeededByDate(req.neededByDate ? new Date(req.neededByDate) : null);
    setCity(req.city ?? '');
    setCoords(req.lat != null && req.lng != null ? { lat: req.lat, lng: req.lng } : null);
    setNotes(req.notes ?? '');
    setShowCreate(true);
  };

  const closeForm = () => {
    setShowCreate(false);
    // A half-finished new requirement is kept as a draft; an edit is not, or it would leak into the next "New".
    if (editing) resetForm();
  };

  const handleEdit = async () => {
    if (!editing) return;
    setError(null);
    const qty = Number(quantityNeeded);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity needed.');
      return;
    }
    if (qty < minQuantity) {
      setError(
        pendingOffers.length > 0 && minQuantity === editing.quantityNeeded
          ? `Nurseries have offered against ${editing.quantityNeeded.toLocaleString('en-IN')} saplings, so the quantity can only go up.`
          : `The quantity can't go below ${minQuantity.toLocaleString('en-IN')} – that much is already received or promised.`,
      );
      return;
    }

    // Send only what actually changed.
    const input: UpdateNgoBulkRequirementInput = {};
    if (!speciesLocked) {
      if ((speciesId ?? null) !== (editing.speciesId ?? null)) input.speciesId = speciesId;
      if (speciesNote.trim() !== (editing.speciesNote ?? '')) input.speciesNote = speciesNote.trim() || null;
    }
    if (qty !== editing.quantityNeeded) input.quantityNeeded = qty;
    const oldDay = editing.neededByDate ? new Date(editing.neededByDate).toDateString() : null;
    if ((neededByDate ? neededByDate.toDateString() : null) !== oldDay) input.neededByDate = neededByDate ? neededByDate.toISOString() : null;
    if (city.trim() !== (editing.city ?? '')) input.city = city.trim() || null;
    if ((coords?.lat ?? null) !== (editing.lat ?? null) || (coords?.lng ?? null) !== (editing.lng ?? null)) {
      input.lat = coords?.lat ?? null;
      input.lng = coords?.lng ?? null;
    }
    if (notes.trim() !== (editing.notes ?? '')) input.notes = notes.trim() || null;

    if (Object.keys(input).length === 0) {
      closeForm();
      return;
    }

    const save = async () => {
      try {
        await updateMutation.mutateAsync({ id: editing.id, input });
        setShowCreate(false);
        resetForm();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not save your changes. Please try again.');
      }
    };

    // Every nursery with a live offer is notified of what changed - say so before sending that.
    const notifies = liveOffers.length > 0 && ('quantityNeeded' in input || 'neededByDate' in input || 'city' in input || 'lat' in input || 'notes' in input);
    if (notifies) {
      const nurseries = new Set(liveOffers.map((r) => r.nurseryId)).size;
      confirm(
        'Save these changes?',
        `${nurseries} nurser${nurseries === 1 ? 'y has' : 'ies have'} already made an offer. ${nurseries === 1 ? 'They' : 'Each of them'} will be notified of what changed.`,
        [
          { text: 'Back', style: 'cancel' },
          { text: 'Save & notify', onPress: save },
        ],
      );
      return;
    }
    await save();
  };

  const handleCreate = async () => {
    if (editing) {
      await handleEdit();
      return;
    }
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
      resetForm();
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
          <TouchableOpacity onPress={guard(() => setShowCreate(true))} style={styles.newButton}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={requirements}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <BulkRequirementCard item={item} onPress={() => setSelectedId(item.id)} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={9}
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        ListHeaderComponent={
          <View style={styles.controls}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchField}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search species, notes or city"
                  placeholderTextColor={COLORS.textLight}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8} accessibilityLabel="Clear search">
                    <Text style={styles.clearX}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, (filtersOpen || activeFilterCount > 0) && styles.filterBtnActive]}
                onPress={() => setFiltersOpen((x) => !x)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Filters and sort"
              >
                <View style={{ gap: 3, alignItems: 'center' }}>
                  {[18, 12, 6].map((w) => (
                    <View key={w} style={{ width: w, height: 2, borderRadius: 1, backgroundColor: filtersOpen || activeFilterCount > 0 ? COLORS.white : COLORS.textSecondary }} />
                  ))}
                </View>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {filtersOpen && (
              <View style={styles.panel}>
                <Text style={styles.panelLabel}>Show</Text>
                <View style={styles.chipWrap}>
                  {REQUIREMENT_FILTERS.map((f) => {
                    const active = filter === f.key;
                    return (
                      <TouchableOpacity key={f.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {f.label}
                          {counts ? `  ${counts[f.key]}` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.panelLabel}>Sort by</Text>
                <TouchableOpacity style={styles.select} onPress={() => setSortOpen(true)} activeOpacity={0.8}>
                  <Text style={styles.selectText}>{REQUIREMENT_SORTS.find((x) => x.key === sort)?.label}</Text>
                  <Text style={styles.selectChevron}>▾</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summary}>
                {data ? `${data.total} requirement${data.total === 1 ? '' : 's'}` : ' '}
                {isFiltering && data ? ' match' : ''}
              </Text>
              {isFiltering ? (
                <TouchableOpacity onPress={clearAll} hitSlop={8}>
                  <Text style={styles.clearAll}>Clear filters</Text>
                </TouchableOpacity>
              ) : isFetching && !isLoading ? (
                <ActivityIndicator size="small" color={COLORS.sage} />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
          ) : isFiltering ? (
            <EmptyState icon="🔎" title="No matches" body="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clearAll} />
          ) : (
            <EmptyState icon="🤝" title="No requirements yet" body="Post one to ask nurseries nearby for bulk saplings." actionLabel="Post a requirement" onAction={() => setShowCreate(true)} />
          )
        }
        ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
      />

      <Sheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        {REQUIREMENT_SORTS.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={styles.option}
            onPress={() => {
              setSort(o.key);
              setSortOpen(false);
            }}
          >
            <Text style={[styles.optionText, sort === o.key && styles.optionTextActive]}>{o.label}</Text>
            {sort === o.key ? <Text style={styles.optionTick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </Sheet>

      <Sheet visible={showCreate} onClose={closeForm} title={editing ? 'Edit requirement' : 'New bulk requirement'} scrollable maxHeight={560}>
        <View style={{ gap: 4 }}>
          {speciesLocked ? (
            <View style={styles.lockBox}>
              <Text style={styles.lockTitle}>🔒 {editing?.species?.commonName ?? editing?.speciesNote ?? 'Any species'}</Text>
              <Text style={styles.lockText}>The species is fixed because nurseries have already made offers on it. To change it, cancel this requirement and post a new one.</Text>
            </View>
          ) : null}
          {!speciesLocked && <Text style={styles.formLabel}>Species (optional)</Text>}
          {speciesLocked ? null : speciesId ? (
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
                    Adding "{speciesQuery.trim() || '…'}" – edit the name in the search box above, then pick an emoji
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
          {!speciesLocked && (
            <>
              <Text style={styles.fieldHint}>
                Matching a catalog species lets nurseries' existing stock be checked when they respond – leave blank for open-ended asks like "any native species".
              </Text>
              <FormField maxLength={200} label="Additional description (optional)" value={speciesNote} onChangeText={setSpeciesNote} placeholder="eg - Native shade trees" />
            </>
          )}
          <FormField required label="Quantity needed" value={quantityNeeded} onChangeText={setQuantityNeeded} placeholder="eg - 0" keyboardType="number-pad" />
          {editing && minQuantity > 0 && (
            <Text style={styles.fieldHint}>
              {pendingOffers.length > 0 && minQuantity === editing.quantityNeeded
                ? `Offers are pending against ${editing.quantityNeeded.toLocaleString('en-IN')} saplings, so this can only go up.`
                : `Can't go below ${minQuantity.toLocaleString('en-IN')} – already received or promised.`}
            </Text>
          )}
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
          <FormField maxLength={1000} label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="eg - Anything nurseries should know" multiline />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <AnimatedButton
            label={editing ? (updateMutation.isPending ? 'Saving…' : 'Save changes') : createMutation.isPending ? 'Posting…' : 'Post requirement'}
            onPress={handleCreate}
            disabled={createMutation.isPending || updateMutation.isPending}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Sheet>

      <DetailSheet id={selectedId} onClose={() => setSelectedId(null)} onEdit={startEdit} />
    </View>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  editButton: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.forest, paddingHorizontal: 16, paddingVertical: 8 },
  editButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  lockBox: { borderWidth: 1, borderColor: 'rgba(139,107,71,0.3)', borderRadius: RADIUS.md, padding: 12, gap: 4, marginBottom: 8 },
  lockTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  lockText: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary },
  controls: { gap: 12, paddingBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: border, borderRadius: 14, paddingHorizontal: 12, height: 46 },
  searchIcon: { fontSize: 14 },
  searchField: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  clearX: { fontSize: 14, color: COLORS.textMuted },
  filterBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterBadge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLORS.golden, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  panel: { gap: 8, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 14 },
  panelLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderRadius: 999, borderWidth: 1.5, borderColor: border, paddingHorizontal: 13, paddingVertical: 7 },
  filterChipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  selectText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  selectChevron: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  summary: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  clearAll: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border },
  optionText: { fontSize: 15, color: COLORS.textPrimary },
  optionTextActive: { fontWeight: '800', color: COLORS.forest },
  optionTick: { fontSize: 16, color: COLORS.forest, fontWeight: '800' },

  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetEmojiTile: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  sheetProgressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  sheetQtyStrong: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  sheetPercent: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  sheetTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(94,133,80,0.15)', overflow: 'hidden' },
  sheetFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 4 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: border, borderRadius: RADIUS.md },
  fact: { width: '50%', padding: 12, gap: 2 },
  factLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  factValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  factSub: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.12)', paddingHorizontal: 11, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  notesBox: { gap: 4 },

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
  sheetSpecies: { ...TEXT.subheading, color: COLORS.textPrimary },
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
