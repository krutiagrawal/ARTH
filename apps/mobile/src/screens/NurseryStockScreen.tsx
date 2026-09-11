import React, { useCallback, useState } from 'react';
import { View, Image, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
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
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import {
  useSaplingStock,
  useCreateSaplingStock,
  useDeleteSaplingStock,
  useNurseryProfile,
} from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import type { ApiSaplingStock } from '../api/nursery';
import { ApiError, resolveMediaUrl } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

function StockRow({ item, onDelete }: { item: ApiSaplingStock; onDelete: () => void }) {
  const photoUri = resolveMediaUrl(item.photoUrl);
  return (
    <BorderCard noPadding style={styles.row}>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 18 }}>🌱</Text></View>}
      <View style={styles.rowText}>
        <Text style={styles.species}>{item.species}</Text>
        <Text style={styles.meta}>
          {item.quantity} in stock · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
        </Text>
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
  const createMutation = useCreateSaplingStock();
  const deleteMutation = useDeleteSaplingStock();

  const [species, setSpecies] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

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

  const handleAdd = async () => {
    setError(null);
    const qty = Number(quantity);
    if (!species.trim() || !Number.isFinite(qty) || qty < 0) {
      setError('Enter a species and a valid quantity.');
      return;
    }
    const price = priceCents.trim() ? Number(priceCents) * 100 : undefined;
    try {
      await createMutation.mutateAsync({
        species: species.trim(),
        quantity: qty,
        isFree: !priceCents.trim(),
        priceCents: price,
        photo: photo ?? undefined,
      });
      setSpecies('');
      setQuantity('');
      setPriceCents('');
      setPhoto(null);
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

      <View style={styles.addCard}>
        <FormField label="Species" value={species} onChangeText={setSpecies} placeholder="e.g. Neem" />
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

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={stock}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          renderItem={({ item }) => <StockRow item={item} onDelete={() => handleDelete(item)} />}
          ListEmptyComponent={
            <EmptyState icon="🌱" title="No stock yet" body="Add your first species above to get started." />
          }
        />
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addCard: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineField: { flex: 1 },
  addButton: { marginTop: 8 },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 4 },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  photoPreview: { width: 36, height: 36, borderRadius: 8 },
  photoPreviewPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  photoPickerText: { fontSize: 13, fontWeight: '600', color: COLORS.forest },
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
  deleteIcon: { fontSize: 18 },
});
