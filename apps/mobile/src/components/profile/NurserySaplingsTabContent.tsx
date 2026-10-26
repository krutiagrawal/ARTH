import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Keyboard } from 'react-native';
import { Text, TextInput } from '../common/AppText';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { BorderCard } from '../common/BorderCard';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';
import {
  useWishlist,
  useAddWishlistItem,
  useRemoveWishlistItem,
  useCart,
  useAddCartItem,
  useUpdateCartItem,
  useRemoveCartItem,
  useUpdateSaplingStock,
} from '../../hooks/useApiQueries';
import type { ApiSaplingStock } from '../../api/nursery';
import { stockDetailBits } from '../../utils/stockDetails';

import { TEXT } from '../../constants/typography';
/** The nursery owner uploading a new photo for one of their own listings – uploads immediately
 * on pick, no separate save step. */
function OwnThumb({ item }: { item: ApiSaplingStock }) {
  const updateMutation = useUpdateSaplingStock();
  const photoUri = resolveMediaUrl(item.photoUrl);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
  const navigation = useNavigation<any>();
  const confirm = useConfirm();
  const { data: cart } = useCart();
  const addMutation = useAddCartItem();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();

  const cartItem = cart?.items.find((c) => c.stockId === item.id);
  const soldOut = item.quantity < 1;
  const busy = addMutation.isPending || updateMutation.isPending || removeMutation.isPending;

  // Looks disabled but stays tappable so it can explain itself – a silently dead button reads as a bug.
  if (soldOut) {
    return (
      <TouchableOpacity
        style={[styles.addButton, styles.addButtonDisabled]}
        onPress={() => confirm('Stocked out', `${item.species} is stocked out right now.`)}
        accessibilityState={{ disabled: true }}
      >
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>
    );
  }

  if (!cartItem) {
    return (
      <TouchableOpacity style={styles.addButton} onPress={() => addMutation.mutate({ stockId: item.id, quantity: 1 })} disabled={busy}>
        <Text style={styles.addButtonText}>{addMutation.isPending ? '…' : '+ Add'}</Text>
      </TouchableOpacity>
    );
  }

  const atMax = cartItem.quantity >= item.quantity;

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
      <TouchableOpacity
        style={[styles.stepperButton, atMax && styles.stepperButtonDisabled]}
        onPress={() =>
          atMax
            ? confirm('No more available', `Only ${item.quantity} ${item.species} in stock, and all of them are in your cart.`)
            : adjust(1)
        }
        disabled={busy}
        accessibilityState={{ disabled: atMax }}
      >
        <Text style={styles.stepperButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// Heart toggle: saved saplings also get a "back in stock" notification, which is why it stays
// available on sold-out rows where there's nothing to add to the cart.
function WishlistHeart({ item }: { item: ApiSaplingStock }) {
  const { data: wishlist } = useWishlist();
  const addMutation = useAddWishlistItem();
  const removeMutation = useRemoveWishlistItem();
  const saved = wishlist?.find((w) => w.stockId === item.id);
  const busy = addMutation.isPending || removeMutation.isPending;
  return (
    <TouchableOpacity
      onPress={() => (saved ? removeMutation.mutate(saved.id) : addMutation.mutate({ stockId: item.id }))}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.4 4.8 6.6 4.5c1.9-.2 3.7.8 5.4 2.9 1.7-2.1 3.5-3.1 5.4-2.9 3.2.3 4.9 3.5 3.8 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"
          fill={saved ? COLORS.coral : 'none'}
          stroke={saved ? COLORS.coral : COLORS.earth}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

function SaplingRow({ item, isOwn }: { item: ApiSaplingStock; isOwn: boolean }) {
  const photoUri = resolveMediaUrl(item.photoUrl);
  const detailBits = stockDetailBits(item);
  const environments = item.suitableEnvironments?.length ? item.suitableEnvironments.join(', ') : null;
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
          {item.quantity < 1 ? (
            <Text style={styles.soldOutInline}>Stocked out</Text>
          ) : (
            `${item.quantity} available`
          )}{' '}
          · {item.isFree ? 'Free' : item.priceCents != null ? `₹${(item.priceCents / 100).toFixed(0)}` : 'Priced'}
        </Text>
        {detailBits.length > 0 && <Text style={styles.meta}>{detailBits.join(' · ')}</Text>}
        {environments && <Text style={styles.meta}>Suits: {environments}</Text>}
        {item.nurseryNotes ? <Text style={styles.notes} numberOfLines={2}>{item.nurseryNotes}</Text> : null}
      </View>
      {!isOwn && <WishlistHeart item={item} />}
      {!isOwn && <CartControls item={item} />}
    </View>
  );
}

/**
 * Replaces the generic "Drives" tab on a nursery's profile – nurseries don't run drives, but
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
  serverSearch,
}: {
  isOwn: boolean;
  stock: ApiSaplingStock[];
  isLoading?: boolean;
  /** Own profile: the list is paged and searched on the server, so the typed text is reported to
   * the parent (which refetches) instead of filtering the loaded rows here, and a "Load more"
   * button appears while more pages remain. */
  serverSearch?: { query: string; onQueryChange: (q: string) => void; hasMore: boolean; loadingMore: boolean; onLoadMore: () => void };
  /** Own profile only – full add/edit/delete still lives on the dedicated inventory screen. */
  onManageInventory?: () => void;
  /** Called with this section's Y offset inside the parent ScrollView the moment the search
   * field gets focus, so the parent can explicitly scroll it near the top of the screen –
   * deliberately not relying on the OS to auto-scroll a focused input into view, since that
   * didn't reliably happen here. */
  onSearchFocusScroll?: (y: number) => void;
}) {
  const sectionY = useRef(0);
  const [localQuery, setLocalQuery] = useState('');
  const query = serverSearch ? serverSearch.query : localQuery;
  const setQuery = serverSearch ? serverSearch.onQueryChange : setLocalQuery;
  const filtered = useMemo(() => {
    if (serverSearch) return stock; // already filtered by the server
    const q = query.trim().toLowerCase();
    return q ? stock.filter((item) => item.species.toLowerCase().includes(q)) : stock;
  }, [stock, query, serverSearch]);

  if (isLoading && stock.length === 0) return <ActivityIndicator color={COLORS.sage} style={{ marginTop: 24 }} />;

  // With server-side search an empty result must keep the search box (to clear it), so only a truly
  // empty catalogue - no results and no search text - gets the empty state.
  if (stock.length === 0 && !(serverSearch && query.trim())) {
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
          placeholder="eg - Search saplings by species..."
          placeholderTextColor={COLORS.textLight}
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
      {serverSearch?.hasMore && (
        <TouchableOpacity onPress={serverSearch.onLoadMore} disabled={serverSearch.loadingMore} style={styles.manageLink}>
          <Text style={styles.manageLinkText}>{serverSearch.loadingMore ? 'Loading…' : 'Load more saplings'}</Text>
        </TouchableOpacity>
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
  addButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, minWidth: 84, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  addButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  soldOutChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.06)' },
  notes: { fontSize: 11, fontStyle: 'italic', color: COLORS.textMuted, marginTop: 3 },
  soldOutInline: { fontWeight: '700', color: COLORS.dangerDark },
  addButtonDisabled: { opacity: 0.4 },
  stepperButtonDisabled: { opacity: 0.4 },
  soldOutText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.beige, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { ...TEXT.button, color: COLORS.forest },
  stepperValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, minWidth: 18, textAlign: 'center' },
  manageLink: { alignSelf: 'center', paddingVertical: 8 },
  manageLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.sageLight },
});
