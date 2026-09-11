import React, { useCallback, useMemo, useState } from 'react';
import { View, Image, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { StatusModal } from '../components/common/StatusModal';
import { Toggle } from '../components/common/Toggle';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import {
  useSaplingStock,
  useCreateSaplingStock,
  useDeleteSaplingStock,
  useNurseryProfile,
  useSpecies,
} from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import type { ApiSaplingStock, SunlightNeeds, WaterNeeds } from '../api/nursery';
import { ApiError, resolveMediaUrl } from '../api/client';
import { SPECIES_EMOJI_OPTIONS } from '../api/species';
import { useConfirm } from '../context/ConfirmDialogContext';

const ENVIRONMENT_OPTIONS = ['terrace', 'garden', 'farm', 'roadside'];
const SEASON_OPTIONS = ['monsoon', 'winter', 'summer', 'year-round'];
const SUNLIGHT_OPTIONS: SunlightNeeds[] = ['full_sun', 'partial_shade', 'shade'];
const WATER_OPTIONS: WaterNeeds[] = ['low', 'medium', 'high'];

const AVAILABILITY_LABEL: Record<ApiSaplingStock['availabilityStatus'], string> = {
  available: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
};
const AVAILABILITY_COLOR: Record<ApiSaplingStock['availabilityStatus'], string> = {
  available: COLORS.forest,
  low_stock: COLORS.golden,
  out_of_stock: COLORS.coral,
};

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StockRow({ item, onDelete }: { item: ApiSaplingStock; onDelete: () => void }) {
  const photoUri = resolveMediaUrl(item.photoUrl);
  const metaBits = [
    `${item.quantity} in stock`,
    item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced',
  ];
  if (item.ageLabel) metaBits.push(item.ageLabel);
  return (
    <BorderCard noPadding style={styles.row}>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 18 }}>{item.speciesRef?.emoji ?? '🌱'}</Text></View>}
      <View style={styles.rowText}>
        <Text style={styles.species}>{item.speciesRef?.commonName ?? item.species}</Text>
        <Text style={styles.meta}>{metaBits.join(' · ')}</Text>
        <View style={[styles.availBadge, { backgroundColor: `${AVAILABILITY_COLOR[item.availabilityStatus]}22` }]}>
          <Text style={[styles.availBadgeText, { color: AVAILABILITY_COLOR[item.availabilityStatus] }]}>{AVAILABILITY_LABEL[item.availabilityStatus]}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Remove ${item.species}`}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </BorderCard>
  );
}

export function NurseryStockScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: stock = [], isLoading } = useSaplingStock();
  const { data: speciesCatalog = [] } = useSpecies();
  const createMutation = useCreateSaplingStock();
  const deleteMutation = useDeleteSaplingStock();

  // ---- Fast path: species picker + quantity + price ----
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [showSpeciesResults, setShowSpeciesResults] = useState(false);
  const [showAddSpecies, setShowAddSpecies] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Inline "can't find it" species definition ----
  const [newCommonName, setNewCommonName] = useState('');
  const [newEmoji, setNewEmoji] = useState<string | null>(null);
  const [newScientificName, setNewScientificName] = useState('');
  const [newLocalName, setNewLocalName] = useState('');
  const [newIsNative, setNewIsNative] = useState(false);
  const [newSunlight, setNewSunlight] = useState<SunlightNeeds | null>(null);
  const [newWater, setNewWater] = useState<WaterNeeds | null>(null);
  const [newSoilNeeds, setNewSoilNeeds] = useState('');
  const [newMatureHeight, setNewMatureHeight] = useState('');
  const [newSeasons, setNewSeasons] = useState<string[]>([]);

  // ---- "More details" collapsible (stock-level) ----
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [ageLabel, setAgeLabel] = useState('');
  const [heightLabel, setHeightLabel] = useState('');
  const [potSize, setPotSize] = useState('');
  const [environments, setEnvironments] = useState<string[]>([]);
  const [nurseryNotes, setNurseryNotes] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');

  const confirm = useConfirm();
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

  const speciesMatches = useMemo(() => {
    const q = speciesQuery.trim().toLowerCase();
    if (!q) return [];
    return speciesCatalog.filter((s) => s.commonName.toLowerCase().includes(q)).slice(0, 8);
  }, [speciesQuery, speciesCatalog]);

  const toggleInArray = (arr: string[], value: string) => (arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = !result.canceled ? result.assets[0] : undefined;
    if (asset) {
      setPhoto({ uri: asset.uri, name: asset.fileName ?? 'stock.jpg', type: asset.mimeType ?? 'image/jpeg' });
    }
  }, []);

  const resetForm = () => {
    setSpeciesQuery('');
    setSelectedSpeciesId(null);
    setShowAddSpecies(false);
    setQuantity('');
    setPriceCents('');
    setPhoto(null);
    setNewCommonName('');
    setNewEmoji(null);
    setNewScientificName('');
    setNewLocalName('');
    setNewIsNative(false);
    setNewSunlight(null);
    setNewWater(null);
    setNewSoilNeeds('');
    setNewMatureHeight('');
    setNewSeasons([]);
    setShowMoreDetails(false);
    setAgeLabel('');
    setHeightLabel('');
    setPotSize('');
    setEnvironments([]);
    setNurseryNotes('');
    setLowStockThreshold('');
  };

  const handleAdd = async () => {
    setError(null);
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setError('Enter a valid quantity.');
      return;
    }
    if (!selectedSpeciesId && !newCommonName.trim()) {
      setError('Pick a species, or add details for a new one.');
      return;
    }
    const price = priceCents.trim() ? Number(priceCents) * 100 : undefined;
    try {
      await createMutation.mutateAsync({
        quantity: qty,
        isFree: !priceCents.trim(),
        priceCents: price,
        photo: photo ?? undefined,
        speciesId: selectedSpeciesId ?? undefined,
        speciesDetails: !selectedSpeciesId
          ? {
              commonName: newCommonName.trim(),
              emoji: newEmoji ?? undefined,
              scientificName: newScientificName.trim() || undefined,
              localName: newLocalName.trim() || undefined,
              isNative: newIsNative,
              sunlightNeeds: newSunlight ?? undefined,
              waterNeeds: newWater ?? undefined,
              soilNeeds: newSoilNeeds.trim() || undefined,
              matureHeightLabel: newMatureHeight.trim() || undefined,
              plantingSeasons: newSeasons.length ? newSeasons : undefined,
            }
          : undefined,
        ageLabel: ageLabel.trim() || undefined,
        heightLabel: heightLabel.trim() || undefined,
        potSize: potSize.trim() || undefined,
        suitableEnvironments: environments.length ? environments : undefined,
        nurseryNotes: nurseryNotes.trim() || undefined,
        lowStockThreshold: lowStockThreshold.trim() ? Number(lowStockThreshold) : undefined,
      });
      resetForm();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this item. Please try again.');
    }
  };

  const handleDelete = (item: ApiSaplingStock) => {
    confirm('Remove stock item?', `Remove ${item.species} from your inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: guard(() => deleteMutation.mutate(item.id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Sapling Inventory"
        subtitle="What you have available to give or sell"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      <FlatList
        data={stock}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        renderItem={({ item }) => <StockRow item={item} onDelete={() => handleDelete(item)} />}
        ListHeaderComponent={
          <View style={styles.addCard}>
            <Text style={styles.formLabel}>Species</Text>
            {selectedSpeciesId ? (
              <View style={styles.selectedSpeciesRow}>
                <Text style={styles.selectedSpeciesText}>
                  {speciesCatalog.find((s) => s.id === selectedSpeciesId)?.emoji}{' '}
                  {speciesCatalog.find((s) => s.id === selectedSpeciesId)?.commonName}
                </Text>
                <TouchableOpacity onPress={() => setSelectedSpeciesId(null)}>
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
                  placeholder="Search species e.g. Neem"
                  placeholderTextColor={COLORS.textMuted}
                />
                {showSpeciesResults && speciesMatches.length > 0 && (
                  <View style={styles.resultsList}>
                    {speciesMatches.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.resultRow}
                        onPress={() => {
                          setSelectedSpeciesId(s.id);
                          setShowSpeciesResults(false);
                          setShowAddSpecies(false);
                        }}
                      >
                        <Text style={styles.resultText}>{s.emoji} {s.commonName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity onPress={() => setShowAddSpecies((prev) => !prev)} style={styles.addSpeciesToggle}>
                  <Text style={styles.addSpeciesToggleText}>{showAddSpecies ? '✕ Cancel' : "Can't find it? Add details"}</Text>
                </TouchableOpacity>
              </>
            )}

            {showAddSpecies && !selectedSpeciesId && (
              <View style={styles.inlineSpeciesBlock}>
                <FormField label="Common name" value={newCommonName} onChangeText={setNewCommonName} placeholder="e.g. Karanj" />
                <Text style={[styles.formLabel, { marginTop: 10 }]}>Emoji</Text>
                <View style={styles.emojiGrid}>
                  {SPECIES_EMOJI_OPTIONS.slice(0, 16).map((emoji) => (
                    <TouchableOpacity key={emoji} onPress={() => setNewEmoji(emoji)} style={[styles.emojiChip, newEmoji === emoji && styles.emojiChipSelected]}>
                      <Text style={styles.emojiChipText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <FormField label="Quantity" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="number-pad" />
              </View>
              <View style={styles.inlineField}>
                <FormField label="Price ₹ (blank = free)" value={priceCents} onChangeText={setPriceCents} placeholder="0" keyboardType="number-pad" />
              </View>
            </View>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoPickerRow}>
              {photo ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : <View style={styles.photoPreviewPlaceholder}><Text style={{ fontSize: 16 }}>📷</Text></View>}
              <Text style={styles.photoPickerText}>{photo ? 'Change photo' : 'Add a photo (optional)'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowMoreDetails((prev) => !prev)} style={styles.moreDetailsToggle}>
              <Text style={styles.moreDetailsToggleText}>{showMoreDetails ? '▲ Hide more details' : '▼ More details (optional)'}</Text>
            </TouchableOpacity>

            {showMoreDetails && (
              <View style={styles.moreDetailsBlock}>
                <View style={styles.inlineRow}>
                  <View style={styles.inlineField}>
                    <FormField label="Age" value={ageLabel} onChangeText={setAgeLabel} placeholder="e.g. 6 months" />
                  </View>
                  <View style={styles.inlineField}>
                    <FormField label="Height" value={heightLabel} onChangeText={setHeightLabel} placeholder="e.g. 2 ft" />
                  </View>
                </View>
                <View style={styles.inlineRow}>
                  <View style={styles.inlineField}>
                    <FormField label="Pot size" value={potSize} onChangeText={setPotSize} placeholder="e.g. 10 inch" />
                  </View>
                  <View style={styles.inlineField}>
                    <FormField label="Low stock alert below" value={lowStockThreshold} onChangeText={setLowStockThreshold} placeholder="5" keyboardType="number-pad" />
                  </View>
                </View>

                <Text style={styles.formLabel}>Suitable for</Text>
                <View style={styles.chipRow}>
                  {ENVIRONMENT_OPTIONS.map((env) => (
                    <Chip key={env} label={env} selected={environments.includes(env)} onPress={() => setEnvironments((prev) => toggleInArray(prev, env))} />
                  ))}
                </View>

                <FormField label="Notes (visible to you only)" value={nurseryNotes} onChangeText={setNurseryNotes} placeholder="Internal notes" multiline />

                {showAddSpecies && !selectedSpeciesId && (
                  <>
                    <Text style={styles.botanicalHeading}>New species botanical details</Text>
                    <View style={styles.inlineRow}>
                      <View style={styles.inlineField}>
                        <FormField label="Scientific name" value={newScientificName} onChangeText={setNewScientificName} placeholder="Optional" />
                      </View>
                      <View style={styles.inlineField}>
                        <FormField label="Local name" value={newLocalName} onChangeText={setNewLocalName} placeholder="Optional" />
                      </View>
                    </View>
                    <View style={styles.toggleRow}>
                      <Text style={styles.formLabel}>Native species</Text>
                      <Toggle value={newIsNative} onValueChange={setNewIsNative} />
                    </View>
                    <Text style={styles.formLabel}>Sunlight needs</Text>
                    <View style={styles.chipRow}>
                      {SUNLIGHT_OPTIONS.map((v) => (
                        <Chip key={v} label={v.replace('_', ' ')} selected={newSunlight === v} onPress={() => setNewSunlight(newSunlight === v ? null : v)} />
                      ))}
                    </View>
                    <Text style={styles.formLabel}>Water needs</Text>
                    <View style={styles.chipRow}>
                      {WATER_OPTIONS.map((v) => (
                        <Chip key={v} label={v} selected={newWater === v} onPress={() => setNewWater(newWater === v ? null : v)} />
                      ))}
                    </View>
                    <FormField label="Soil needs" value={newSoilNeeds} onChangeText={setNewSoilNeeds} placeholder="Optional" />
                    <FormField label="Mature height" value={newMatureHeight} onChangeText={setNewMatureHeight} placeholder="e.g. 15-20 ft" />
                    <Text style={styles.formLabel}>Planting seasons</Text>
                    <View style={styles.chipRow}>
                      {SEASON_OPTIONS.map((s) => (
                        <Chip key={s} label={s} selected={newSeasons.includes(s)} onPress={() => setNewSeasons((prev) => toggleInArray(prev, s))} />
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
            <AnimatedButton
              label={createMutation.isPending ? 'Adding…' : '+ Add to inventory'}
              onPress={guard(handleAdd)}
              disabled={createMutation.isPending}
              fullWidth
              gradientColors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.addButton}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
          ) : (
            <EmptyState icon="🌱" title="No stock yet" body="Add your first species above to get started." />
          )
        }
      />

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addCard: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  formLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 },
  searchInput: {
    // No fill — an outline on the page, not a panel laid over it. Matches FormField's recipe.
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
  addSpeciesToggle: { marginTop: 8, paddingVertical: 4 },
  addSpeciesToggleText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  inlineSpeciesBlock: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  emojiChip: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(139, 107, 71, 0.30)' },
  emojiChipSelected: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  emojiChipText: { fontSize: 16 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  addButton: { marginTop: 8 },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 4 },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  photoPreview: { width: 36, height: 36, borderRadius: 8 },
  photoPreviewPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  photoPickerText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
  moreDetailsToggle: { marginTop: 12, paddingVertical: 6 },
  moreDetailsToggleText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  moreDetailsBlock: {
    gap: 4,
    marginTop: 4,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    padding: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  chipSelected: { backgroundColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextSelected: { color: COLORS.white },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 },
  botanicalHeading: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 10, marginBottom: 2 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  thumbPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  availBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  availBadgeText: { fontSize: 10, fontWeight: '700' },
  deleteIcon: { fontSize: 18 },
});
