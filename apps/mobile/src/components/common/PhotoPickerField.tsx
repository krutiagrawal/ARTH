import React, { useCallback } from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from './AppText';
import * as ImagePicker from 'expo-image-picker';
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
}

function assetToPhoto(asset: ImagePicker.ImagePickerAsset): PickedPhoto {
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/**
 * Shared photo-capture control used across NGO screens. `mode="camera"` shows
 * only the device camera (no gallery affordance anywhere) — used for the
 * real-time Update posting flow, which deliberately does not allow picking
 * from the gallery. `mode="gallery"`/`"both"` are for cover-photo-style
 * pickers where a curated gallery image is appropriate.
 */
export function PhotoPickerField({ photo, onChange, mode = 'gallery', label, hint, icon, aspect = [1, 1] }: PhotoPickerFieldProps) {
  const { medium } = useHaptics();
  const glyph = icon ?? (mode === 'camera' ? '📸' : '🖼️');

  const pickFromGallery = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  if (mode === 'both') {
    return (
      <TouchableOpacity
        style={[styles.picker, photo ? styles.pickerFilled : styles.pickerEmpty]}
        onPress={pickFromGallery}
        onLongPress={captureFromCamera}
      >
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <>
            <Text style={styles.pickerIcon}>{glyph}</Text>
            <Text style={styles.pickerText}>{label ?? 'Add Photo'}</Text>
            <Text style={styles.pickerHint}>{hint ?? 'Tap for gallery, hold for camera'}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const onPress = mode === 'camera' ? captureFromCamera : pickFromGallery;

  return (
    <TouchableOpacity
      style={[styles.picker, photo ? styles.pickerFilled : styles.pickerEmpty]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      ) : (
        <>
          <Text style={styles.pickerIcon}>{glyph}</Text>
          <Text style={styles.pickerText}>{label ?? 'Add Photo'}</Text>
          {hint ? <Text style={styles.pickerHint}>{hint}</Text> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 6,
    height: 140,
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
  pickerFilled: { backgroundColor: 'transparent' },
  preview: { width: '100%', height: '100%' },
  pickerIcon: { fontSize: 26 },
  pickerText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  pickerHint: { color: COLORS.textMuted, fontSize: 12 },
});
