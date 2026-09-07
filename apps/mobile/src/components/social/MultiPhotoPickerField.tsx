import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../common/AppText';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { useHaptics } from '../../hooks/useHaptics';
import { useConfirm } from '../../context/ConfirmDialogContext';
import type { PickedPhoto } from '../common/PhotoPickerField';

interface MultiPhotoPickerFieldProps {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max?: number;
  /** Matches PhotoPickerField's API so the two feel like one control. */
  mode?: 'camera' | 'gallery' | 'both';
  label?: string;
  hint?: string;
}

function assetToPhoto(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/**
 * Ordered multi-photo picker for posts and past-work entries.
 *
 * Order is the carousel order, so each thumbnail carries its position plus arrows to shuffle it —
 * drag-to-reorder needs a gesture-handler list, and for six items arrows are less fiddly on a
 * phone anyway.
 */
export function MultiPhotoPickerField({
  photos,
  onChange,
  max = 6,
  mode = 'both',
  label = 'Photos',
  hint,
}: MultiPhotoPickerFieldProps) {
  const { medium, selection } = useHaptics();
  const confirm = useConfirm();
  const remaining = max - photos.length;
  const isFull = remaining <= 0;

  const add = useCallback(
    (picked: PickedPhoto[]) => {
      if (picked.length === 0) return;
      // Trimmed rather than rejected: picking 5 when 3 slots are left should keep 3, not fail.
      onChange([...photos, ...picked].slice(0, max));
    },
    [photos, onChange, max],
  );

  const pickFromGallery = useCallback(async () => {
    if (isFull) {
      confirm('Photo limit reached', `You can add up to ${max} photos.`);
      return;
    }
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (!result.canceled) add(result.assets.map(assetToPhoto));
  }, [isFull, max, medium, remaining, add]);

  const captureFromCamera = useCallback(async () => {
    if (isFull) {
      confirm('Photo limit reached', `You can add up to ${max} photos.`);
      return;
    }
    medium();
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) add([assetToPhoto(result.assets[0])]);
  }, [isFull, max, medium, add]);

  const removeAt = useCallback(
    (index: number) => {
      selection();
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange, selection],
  );

  const move = useCallback(
    (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= photos.length) return;
      selection();
      const next = [...photos];
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    },
    [photos, onChange, selection],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.counter}>
          {photos.length}/{max}
        </Text>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>

              <TouchableOpacity style={styles.removeBtn} onPress={() => removeAt(index)} hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.moveRow}>
                <TouchableOpacity
                  style={[styles.moveBtn, index === 0 && styles.moveBtnDisabled]}
                  disabled={index === 0}
                  onPress={() => move(index, -1)}
                  hitSlop={6}
                >
                  <Text style={styles.moveText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moveBtn, index === photos.length - 1 && styles.moveBtnDisabled]}
                  disabled={index === photos.length - 1}
                  onPress={() => move(index, 1)}
                  hitSlop={6}
                >
                  <Text style={styles.moveText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        {mode !== 'gallery' && (
          <TouchableOpacity
            style={[styles.action, isFull && styles.actionDisabled]}
            onPress={captureFromCamera}
            disabled={isFull}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionText}>Camera</Text>
          </TouchableOpacity>
        )}
        {mode !== 'camera' && (
          <TouchableOpacity
            style={[styles.action, isFull && styles.actionDisabled]}
            onPress={pickFromGallery}
            disabled={isFull}
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionText}>Gallery</Text>
          </TouchableOpacity>
        )}
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const THUMB = 92;

const styles = StyleSheet.create({
  wrap: { marginTop: 6, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: FONTS.display, fontSize: 16, lineHeight: 22, color: COLORS.textPrimary },
  counter: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  strip: { gap: 10, paddingRight: 4 },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  thumb: { width: '100%', height: '100%' },
  orderBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  moveRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  moveBtn: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  moveBtnDisabled: { opacity: 0.25 },
  moveText: { color: COLORS.white, fontSize: 16, fontWeight: '800', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 107, 71, 0.35)',
  },
  actionDisabled: { opacity: 0.4 },
  actionIcon: { fontSize: 18 },
  actionText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  hint: { color: COLORS.textMuted, fontSize: 12, marginTop: -2 },
});

export type { PickedPhoto };
export const MULTI_PICKER_SPACING = SPACING.md;
