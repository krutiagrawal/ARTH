import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { RADIUS, SPACING } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import type { LessonImage as LessonImageData } from '../../api/games';

interface LessonImageProps {
  image: LessonImageData;
  /** Width / height. Heroes are wider than inline photos. */
  aspectRatio?: number;
  /** Rounded card style (inline) vs. edge-to-edge (hero). */
  rounded?: boolean;
  showCaption?: boolean;
}

/**
 * An article photo with caption and credit. Photos come from remote URLs, so a failed load simply
 * hides the image (and its caption) instead of leaving a broken box in the middle of an article.
 */
export function LessonImage({ image, aspectRatio = 16 / 10, rounded = true, showCaption = true }: LessonImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const uri = resolveMediaUrl(image.url);
  if (!uri) return null;

  const openSource = () => {
    if (image.sourceUrl) Linking.openURL(image.sourceUrl).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      <Image
        // Some hosts (Wikimedia) refuse React Native's default Android user agent, so identify the app.
        source={{ uri, headers: { 'User-Agent': 'ARTH-app/1.0 (https://arth.app)' } }}
        style={[styles.image, { aspectRatio }, rounded && styles.rounded]}
        resizeMode="cover"
        accessibilityLabel={image.alt}
        onError={(e) => {
          if (__DEV__) console.warn('[LessonImage] failed to load', uri, e.nativeEvent?.error);
          setFailed(true);
        }}
      />
      {showCaption ? (
        <View style={styles.captionWrap}>
          {image.caption ? <Text style={styles.caption}>{image.caption}</Text> : null}
          <TouchableOpacity onPress={openSource} disabled={!image.sourceUrl} accessibilityRole="link" accessibilityLabel={`Photo credit: ${image.credit}`}>
            <Text style={styles.credit}>Photo: {image.credit}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  image: { width: '100%', backgroundColor: COLORS.mint },
  rounded: { borderRadius: RADIUS.md },
  captionWrap: { paddingTop: SPACING.xs, paddingHorizontal: 2 },
  caption: { ...TEXT.bodySmall, color: COLORS.textPrimary },
  credit: { ...TEXT.caption, color: COLORS.textSecondary, marginTop: 2 },
});
