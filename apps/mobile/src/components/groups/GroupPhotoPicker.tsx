import React, { useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../common/AppText';
import { assetToPhoto, usePhotoPreviewUri, type PickedPhoto } from '../common/PhotoPickerField';
import { COLORS } from '../../constants/colors';
import { useHaptics } from '../../hooks/useHaptics';
import { resolveMediaUrl } from '../../api/client';
import type { GroupType } from '../../api/plantingGroups';
import { groupTypeEmoji } from './GroupBits';

interface Props {
  /** A photo just picked on this device (shown until it has been uploaded). */
  photo: PickedPhoto | null;
  /** The stored logo path from the server, shown when nothing new is picked. */
  existingUri?: string | null;
  groupType: GroupType;
  onChange: (photo: PickedPhoto) => void;
  /** True while the photo is being sent to the server. */
  uploading?: boolean;
  size?: number;
}

/**
 * The group's profile photo: a round picture with a camera badge. Tapping it opens the gallery
 * (square crop). Without a photo it shows the group type's emoji so the group still looks complete.
 */
export function GroupPhotoPicker({ photo, existingUri, groupType, onChange, uploading, size = 104 }: Props) {
  const { medium } = useHaptics();
  const previewUri = usePhotoPreviewUri(photo);
  const stored = !photo ? resolveMediaUrl(existingUri) : undefined;
  const shownUri = photo ? previewUri : stored;

  const pick = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) onChange(assetToPhoto(result.assets[0]));
  }, [medium, onChange]);

  const hasPhoto = !!photo || !!existingUri;

  return (
    <View style={styles.wrap}>
      {/* The image is a sibling of the touchable, not nested in it: nested images don't draw on some devices. */}
      <View style={{ width: size, height: size }}>
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          {shownUri ? (
            <Image source={{ uri: shownUri }} style={{ width: size, height: size }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: size * 0.45 }}>{groupTypeEmoji(groupType)}</Text>
          )}
          {uploading && (
            <View style={styles.uploading}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          )}
        </View>
        <TouchableOpacity style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} onPress={pick} activeOpacity={0.8} disabled={uploading} />
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeIcon}>📷</Text>
        </View>
      </View>
      <TouchableOpacity onPress={pick} disabled={uploading} hitSlop={8}>
        <Text style={styles.caption}>{uploading ? 'Uploading…' : hasPhoto ? 'Change group photo' : 'Add group photo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, marginVertical: 8 },
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  uploading: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.forest,
    borderWidth: 2,
    borderColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: { fontSize: 15 },
  caption: { fontSize: 13, fontWeight: '700', color: COLORS.sageDark },
});
