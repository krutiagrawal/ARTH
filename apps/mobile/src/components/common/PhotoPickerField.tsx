import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

interface PhotoPickerFieldProps {
  photo: PickedPhoto | null;
  onChange: (photo: PickedPhoto) => void;
  mode?: 'camera' | 'gallery' | 'both';
  label?: string;
  /** Second line under the label, e.g. "Tap to capture or upload". `mode="both"`
   * falls back to its own tap/hold explainer when this isn't supplied. */
  hint?: string;
  /** Emoji shown above the label in the empty state. Defaults by `mode`. */
  icon?: string;
  aspect?: [number, number];
  /** Translucent-white chrome for night-gradient screens (signup wizards), matching FormField's dark variant. */
  dark?: boolean;
}

export function assetToPhoto(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/**
 * Renders a resized, low-weight `data:` preview of a locally-picked photo (the full-resolution
 * `file://` original stays untouched for upload). On some devices `<Image>` never resolves the
 * full-resolution local URI at all, so previewing a small copy sidesteps that instead of relying
 * on it directly.
 */
export function usePhotoPreviewUri(photo: PickedPhoto | null): string | undefined {
  const [previewUri, setPreviewUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!photo) {
      setPreviewUri(undefined);
      return;
    }
    let cancelled = false;
    ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 480 } }], {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    })
      .then((result) => {
        if (!cancelled && result.base64) setPreviewUri(`data:image/jpeg;base64,${result.base64}`);
      })
      .catch(() => {
        if (!cancelled) setPreviewUri(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [photo?.uri]);

  return previewUri;
}

/**
 * Shared photo-capture control used across NGO screens. `mode="camera"` shows
 * only the device camera (no gallery affordance anywhere) — used for the
 * real-time Update posting flow, which deliberately does not allow picking
 * from the gallery. `mode="gallery"`/`"both"` are for cover-photo-style
 * pickers where a curated gallery image is appropriate.
 */
export function PhotoPickerField({ photo, onChange, mode = 'gallery', label, hint, icon, aspect = [1, 1], dark }: PhotoPickerFieldProps) {
  const { medium } = useHaptics();
  const glyph = icon ?? (mode === 'camera' ? '📸' : '🖼️');
  const previewUri = usePhotoPreviewUri(photo);

  const pickFromGallery = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) onChange(assetToPhoto(result.assets[0]));
  }, [medium, onChange, aspect]);

  const captureFromCamera = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) onChange(assetToPhoto(result.assets[0]));
  }, [medium, onChange, aspect]);

  const emptyStyle = dark ? styles.pickerEmptyDark : styles.pickerEmpty;
  const textStyle = dark ? styles.pickerTextDark : styles.pickerText;
  const hintStyle = dark ? styles.pickerHintDark : styles.pickerHint;
  const onPress = mode === 'camera' ? captureFromCamera : pickFromGallery;
  const onLongPress = mode === 'both' ? captureFromCamera : undefined;

  // A picked photo renders as a plain View holding the Image, with a transparent touchable
  // overlaid on top (rather than the Image nested inside the TouchableOpacity itself) — on some
  // devices an Image nested directly inside this TouchableOpacity never draws at all, even with a
  // guaranteed-valid, small source; the same Image as a sibling of the touchable renders fine.
  if (photo) {
    return (
      <View style={[styles.picker, styles.pickerFilled]}>
        {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />}
        <TouchableOpacity style={styles.pressOverlay} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.picker, emptyStyle]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={styles.pickerIcon}>{glyph}</Text>
      <Text style={textStyle}>{label ?? 'Add Photo'}</Text>
      {hint || mode === 'both' ? (
        <Text style={hintStyle}>{hint ?? 'Tap for gallery, hold for camera'}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 6,
    height: 220,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
  },
  /** Dashed drop-zone look for the empty state. The border is dropped once a
   * photo is chosen so it doesn't frame the preview image. */
  /** Transparent like `FormField`, so the drop zone matches the other fields on the page; the
   * dashed border is what makes it legible without a fill. */
  pickerEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 107, 71, 0.35)',
  },
  pickerEmptyDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pickerFilled: { backgroundColor: 'transparent' },
  preview: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pressOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pickerIcon: { fontSize: 26 },
  pickerText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  pickerHint: { color: COLORS.textMuted, fontSize: 12 },
  pickerTextDark: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  pickerHintDark: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
});
