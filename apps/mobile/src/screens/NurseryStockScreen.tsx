import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BlurCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import {
  useSaplingStock,
  useCreateSaplingStock,
  useDeleteSaplingStock,
} from '../hooks/useApiQueries';
import type { ApiSaplingStock } from '../api/nursery';
import { ApiError } from '../api/client';

function StockRow({ item, onDelete }: { item: ApiSaplingStock; onDelete: () => void }) {
  return (
    <BlurCard tint="light" noPadding style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.species}>{item.species}</Text>
        <Text style={styles.meta}>
          {item.quantity} in stock · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Remove ${item.species}`}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </BlurCard>
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
  const [error, setError] = useState<string | null>(null);

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
      });
      setSpecies('');
      setQuantity('');
      setPriceCents('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this item. Please try again.');
    }
  };

  const handleDelete = (item: ApiSaplingStock) => {
    Alert.alert('Remove stock item?', `Remove ${item.species} from your inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
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
        {error && <Text style={styles.error}>{error}</Text>}
        <AnimatedButton
          label={createMutation.isPending ? 'Adding…' : '+ Add to inventory'}
          onPress={handleAdd}
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
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  rowText: { flex: 1 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  deleteIcon: { fontSize: 18 },
});
