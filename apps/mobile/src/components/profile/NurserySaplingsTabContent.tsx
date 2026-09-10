import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Keyboard } from 'react-native';
import { Text, TextInput } from '../common/AppText';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { BorderCard } from '../common/BorderCard';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';
import {
  useCart,
  useAddCartItem,
  useUpdateCartItem,
  useRemoveCartItem,
  useUpdateSaplingStock,
} from '../../hooks/useApiQueries';
import type { ApiSaplingStock } from '../../api/nursery';

/** The nursery owner uploading a new photo for one of their own listings — uploads immediately
 * on pick, no separate save step. */
function OwnThumb({ item }: { item: ApiSaplingStock }) {
  const updateMutation = useUpdateSaplingStock();
  const photoUri = resolveMediaUrl(item.photoUrl);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = !result.canceled ? result.assets[0] : undefined;
    if (!asset) return;
    updateMutation.mutate({
      id: item.id,
      input: { photo: { uri: asset.uri, name: asset.fileName ?? 'stock.jpg', type: asset.mimeType ?? 'image/jpeg' } },
    });
  };

  return (
    <TouchableOpacity onPress={pickPhoto} activeOpacity={0.75} style={styles.thumbWrap} accessibilityRole="button" accessibilityLabel={`Change photo for ${item.species}`}>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Text style={{ fontSize: 22 }}>🌱</Text></View>}
      <View style={styles.thumbEditBadge}>
        {updateMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.thumbEditIcon}>📷</Text>}
      </View>
    </TouchableOpacity>
  );
}

function CartControls({ item }: { item: ApiSaplingStock }) {
  const { data: cart } = useCart();
  const addMutation = useAddCartItem();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();

  const cartItem = cart?.items.find((c) => c.stockId === item.id);
  const soldOut = item.quantity < 1;
  const busy = addMutation.isPending || updateMutation.isPending || removeMutation.isPending;

  if (soldOut) {
    return <View style={styles.soldOutChip}><Text style={styles.soldOutText}>Sold out</Text></View>;
  }

  if (!cartItem) {
    return (
      <TouchableOpacity style={styles.addButton} onPress={() => addMutation.mutate({ stockId: item.id, quantity: 1 })} disabled={busy}>
        <Text style={styles.addButtonText}>{addMutation.isPending ? '…' : '+ Add'}</Text>
      </TouchableOpacity>
    );
  }

  const adjust = (delta: number) => {
    const next = cartItem.quantity + delta;
    if (next < 1) removeMutation.mutate(cartItem.id);
    else updateMutation.mutate({ itemId: cartItem.id, quantity: Math.min(item.quantity, next) });
  };

  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity style={styles.stepperButton} onPress={() => adjust(-1)} disabled={busy}>
        <Text style={styles.stepperButtonText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{cartItem.quantity}</Text>
      <TouchableOpacity style={styles.stepperButton} onPress={() => adjust(1)} disabled={busy || cartItem.quantity >= item.quantity}>
        <Text style={styles.stepperButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function SaplingRow({ item, isOwn }: { item: ApiSaplingStock; isOwn: boolean }) {
  const photoUri = resolveMediaUrl(item.photoUrl);
  return (
    <View style={styles.row}>
      {isOwn ? (
        <OwnThumb item={item} />
      ) : photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}><Text style={{ fontSize: 22 }}>🌱</Text></View>
      )}
      <View style={styles.info}>
        <Text style={styles.species} numberOfLines={1}>{item.species}</Text>
        <Text style={styles.meta}>
          {item.quantity} available · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
        </Text>
      </View>
      {!isOwn && <CartControls item={item} />}
    </View>
  );
}

/**
 * Replaces the generic "Drives" tab on a nursery's profile — nurseries don't run drives, but
 * this is exactly where a visitor expects to browse (and buy) what's in stock, and where the
 * owner expects to manage it. Own-profile rows let the nursery tap the photo to upload a new one
 * immediately (no separate edit screen); visitor rows get an inline add-to-cart/quantity stepper
 * instead of bouncing to AddToCartScreen.
 */
export function NurserySaplingsTabContent({
  isOwn,
  stock,
  isLoading,
  onManageInventory,
  onSearchFocusScroll,
}: {
  isOwn: boolean;
  stock: ApiSaplingStock[];
  isLoading?: boolean;
  /** Own profile only — full add/edit/delete still lives on the dedicated inventory screen. */
  onManageInventory?: () => void;
  /** Called with this section's Y offset inside the parent ScrollView the moment the search
   * field gets focus, so the parent can explicitly scroll it near the top of the screen —
   * deliberately not relying on the OS to auto-scroll a focused input into view, since that
   * didn't reliably happen here. */
  onSearchFocusScroll?: (y: number) => void;
}) {
  const sectionY = useRef(0);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? stock.filter((item) => item.species.toLowerCase().includes(q)) : stock;
  }, [stock, query]);

  if (isLoading) return <ActivityIndicator color={COLORS.sage} style={{ marginTop: 24 }} />;

  if (stock.length === 0) {
    return (
      <EmptyState
        icon="🌱"
        title={isOwn ? 'No saplings listed yet' : 'No stock right now'}
        body={isOwn ? 'Add your first species from the inventory screen.' : 'Check back later for available saplings.'}
        actionLabel={isOwn ? 'Manage inventory' : undefined}
        onAction={isOwn ? onManageInventory : undefined}
      />
    );
  }

  return (
    <View style={styles.wrap} onLayout={(e) => { sectionY.current = e.nativeEvent.layout.y; }}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search saplings by species..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
          onFocus={() => onSearchFocusScroll?.(sectionY.current)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.searchIconButton} accessibilityRole="button" accessibilityLabel="Clear search">
            <Text style={styles.searchIconText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.searchIconButton} accessibilityRole="button" accessibilityLabel="Search">
          <Text style={styles.searchIconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No matches" body={`No saplings match "${query.trim()}".`} />
      ) : (
        <BorderCard noPadding style={styles.groupedList}>
          {filtered.map((item, i) => (
            <React.Fragment key={item.id}>
              {i > 0 && <View style={styles.rowDivider} />}
              <SaplingRow item={item} isOwn={isOwn} />
            </React.Fragment>
          ))}
        </BorderCard>
      )}
      {isOwn && onManageInventory && (
        <TouchableOpacity onPress={onManageInventory} style={styles.manageLink}>
          <Text style={styles.manageLinkText}>Manage full inventory →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 10, paddingBottom: 24 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 4,
  },
  searchIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconText: { fontSize: 14, color: COLORS.textSecondary },
  groupedList: { marginBottom: 4 },
  rowDivider: { height: 1, backgroundColor: 'rgba(160,114,74,0.25)', marginHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md },
  thumbEmpty: { backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  thumbEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cream,
  },
  thumbEditIcon: { fontSize: 11 },
  info: { flex: 1 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  soldOutChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.06)' },
  soldOutText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
  stepperValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, minWidth: 18, textAlign: 'center' },
  manageLink: { alignSelf: 'center', paddingVertical: 8 },
  manageLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.sageLight },
});
