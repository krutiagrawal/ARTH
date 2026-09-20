import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { BorderCard } from '../common/BorderCard';
import { FormField } from '../common/FormField';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useUpdateSaplingStock } from '../../hooks/useApiQueries';
import type { ApiSaplingStock } from '../../api/nursery';
import type { PickedPhoto } from '../common/PhotoPickerField';
import { ApiError, resolveMediaUrl } from '../../api/client';
import { SUNLIGHT_LABEL, WATER_LABEL } from '../../constants/plantingGuide';

const ENVIRONMENT_OPTIONS = ['terrace', 'garden', 'farm', 'roadside'];

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

interface StockDetailSheetProps {
  item: ApiSaplingStock | null;
  visible: boolean;
  onClose: () => void;
}

/** Tap-to-open detail + edit dialog for one inventory item — shows the full botanical record
 * (read-only, sourced from the shared species catalog) alongside this nursery's own listing
 * details (editable in place, no separate view/edit mode toggle). */
export function StockDetailSheet({ item, visible, onClose }: StockDetailSheetProps) {
  const updateMutation = useUpdateSaplingStock();

  const [quantity, setQuantity] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [priceCents, setPriceCents] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [heightLabel, setHeightLabel] = useState('');
  const [potSize, setPotSize] = useState('');
  const [environments, setEnvironments] = useState<string[]>([]);
  const [nurseryNotes, setNurseryNotes] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setQuantity(String(item.quantity));
    setIsFree(item.isFree);
    setPriceCents(item.priceCents != null ? String(item.priceCents / 100) : '');
    setAgeLabel(item.ageLabel ?? '');
    setHeightLabel(item.heightLabel ?? '');
    setPotSize(item.potSize ?? '');
    setEnvironments(item.suitableEnvironments ?? []);
    setNurseryNotes(item.nurseryNotes ?? '');
    setLowStockThreshold(item.lowStockThreshold != null ? String(item.lowStockThreshold) : '');
    setPhoto(null);
    setError(null);
  }, [item?.id]);

  if (!item) return null;
  const species = item.speciesRef;
  const photoUri = photo?.uri ?? resolveMediaUrl(item.photoUrl) ?? null;

  const toggleEnvironment = (value: string) => {
    setEnvironments((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const pickPhoto = async () => {
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
  };

  const handleSave = async () => {
    setError(null);
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setError('Enter a valid quantity.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        input: {
          quantity: qty,
          isFree,
          priceCents: !isFree && priceCents.trim() ? Number(priceCents.trim()) * 100 : undefined,
          photo: photo ?? undefined,
          ageLabel: ageLabel.trim() || undefined,
          heightLabel: heightLabel.trim() || undefined,
          potSize: potSize.trim() || undefined,
          suitableEnvironments: environments,
          nurseryNotes: nurseryNotes.trim() || undefined,
          lowStockThreshold: lowStockThreshold.trim() ? Number(lowStockThreshold.trim()) : undefined,
        },
      });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save this item. Please try again.');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={species?.commonName ?? item.species} scrollable maxHeight={640}>
      <View style={styles.photoRow}>
        <TouchableOpacity onPress={pickPhoto} style={styles.photoWrap}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={{ fontSize: 22 }}>{species?.emoji ?? '🌱'}</Text></View>}
          <View style={styles.photoEditBadge}><Text style={styles.photoEditIcon}>✎</Text></View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={[styles.availBadge, { backgroundColor: `${AVAILABILITY_COLOR[item.availabilityStatus]}22` }]}>
            <Text style={[styles.availBadgeText, { color: AVAILABILITY_COLOR[item.availabilityStatus] }]}>{AVAILABILITY_LABEL[item.availabilityStatus]}</Text>
          </View>
        </View>
      </View>

      {species && (
        <BorderCard noPadding style={styles.speciesCard}>
          <Text style={styles.sectionTitle}>Botanical details</Text>
          {species.scientificName && <Text style={styles.speciesLine}>🔬 {species.scientificName}</Text>}
          {species.localName && <Text style={styles.speciesLine}>🗣 {species.localName}</Text>}
          <Text style={styles.speciesLine}>🌍 {species.isNative ? 'Native species' : 'Non-native species'}</Text>
          {species.sunlightNeeds && <Text style={styles.speciesLine}>☀️ {SUNLIGHT_LABEL[species.sunlightNeeds]}</Text>}
          {species.waterNeeds && <Text style={styles.speciesLine}>💧 {WATER_LABEL[species.waterNeeds]}</Text>}
          {species.soilNeeds && <Text style={styles.speciesLine}>🪴 {species.soilNeeds}</Text>}
          {species.matureHeightLabel && <Text style={styles.speciesLine}>📏 Grows to {species.matureHeightLabel}</Text>}
          {species.plantingSeasons?.length > 0 && <Text style={styles.speciesLine}>📅 Best planted: {species.plantingSeasons.join(', ')}</Text>}
        </BorderCard>
      )}

      <Text style={styles.sectionTitle}>Your listing</Text>
      <View style={styles.inlineRow}>
        <View style={styles.inlineField}>
          <FormField label="Quantity" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="number-pad" />
        </View>
        <View style={styles.inlineField}>
          <FormField
            label="Price ₹ (blank = free)"
            value={priceCents}
            onChangeText={(v) => {
              setPriceCents(v);
              setIsFree(!v.trim());
            }}
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
      </View>
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
          <Chip key={env} label={env} selected={environments.includes(env)} onPress={() => toggleEnvironment(env)} />
        ))}
      </View>

      <FormField label="Notes (visible to you only)" value={nurseryNotes} onChangeText={setNurseryNotes} placeholder="Internal notes" multiline />

      {error && <Text style={styles.error}>{error}</Text>}
      <AnimatedButton
        label={updateMutation.isPending ? 'Saving…' : 'Save changes'}
        onPress={handleSave}
        disabled={updateMutation.isPending}
        fullWidth
        gradientColors={[COLORS.forest, COLORS.forestDeep]}
        style={styles.saveButton}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  photoWrap: { position: 'relative' },
  photo: { width: 64, height: 64, borderRadius: RADIUS.md },
  photoPlaceholder: { width: 64, height: 64, borderRadius: RADIUS.md, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  photoEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.cream,
  },
  photoEditIcon: { fontSize: 10, color: COLORS.white, fontWeight: '700' },
  availBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  availBadgeText: { fontSize: 11, fontWeight: '700' },
  speciesCard: { padding: 14, borderRadius: RADIUS.md, marginBottom: 14, gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  speciesLine: { fontSize: 13, color: COLORS.textPrimary },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  formLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  chipSelected: { backgroundColor: COLORS.forest },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextSelected: { color: COLORS.white },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 8 },
  saveButton: { marginTop: 12, marginBottom: 4 },
});
