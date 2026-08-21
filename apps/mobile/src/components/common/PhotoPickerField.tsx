import React, { useCallback } from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
export function PhotoPickerField({ photo, onChange, mode = 'gallery', label, aspect = [1, 1] }: PhotoPickerFieldProps) {
  const { medium } = useHaptics();

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
      <TouchableOpacity style={styles.picker} onPress={pickFromGallery} onLongPress={captureFromCamera}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <>
            <Text style={styles.pickerText}>{label ?? 'Choose photo'}</Text>
            <Text style={styles.pickerHint}>Tap for gallery, hold for camera</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const onPress = mode === 'camera' ? captureFromCamera : pickFromGallery;

  return (
    <TouchableOpacity style={styles.picker} onPress={onPress}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      ) : (
        <Text style={styles.pickerText}>{label ?? (mode === 'camera' ? '📸 Open Camera' : 'Choose photo')}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 6,
    height: 140,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 4,
  },
  preview: { width: '100%', height: '100%' },
  pickerText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },
  pickerHint: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
});
