import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import { EFFECTIVE_WIDTH } from '../../utils/responsive';
import type { ApiPostMedia } from '../../api/posts';

interface MediaCarouselProps {
  media: ApiPostMedia[];
  /** Card width the carousel must fill; defaults to a full-bleed post card. */
  width?: number;
  /** Height as a multiple of width. 1 = square, the default for a photo post. */
  aspect?: number;
  radius?: number;
}

/**
 * Paging photo carousel with dots and an "n/total" pill.
 *
 * Uses a plain FlatList rather than a gesture-handler pager: these sit inside a vertically
 * scrolling feed, and FlatList's native paging is what keeps the horizontal swipe from fighting
 * the parent scroll on Android.
 */
export function MediaCarousel({ media, width = EFFECTIVE_WIDTH - 32, aspect = 1, radius = RADIUS.lg }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  // Kept in a ref as well so a scroll that lands on the same page doesn't re-render.
  const lastIndex = useRef(0);
  const height = width * aspect;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next !== lastIndex.current) {
        lastIndex.current = next;
        setIndex(next);
      }
    },
    [width],
  );

  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <Image
        source={{ uri: resolveMediaUrl(media[0].url) }}
        style={[styles.image, { width, height, borderRadius: radius }]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={{ width }}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m) => m.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Fixed-width pages, so the list can skip measuring and jump directly.
        getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: resolveMediaUrl(item.url) }}
            style={[styles.image, { width, height, borderRadius: radius }]}
            resizeMode="cover"
          />
        )}
      />

      <View style={styles.countPill}>
        <Text style={styles.countText}>
          {index + 1}/{media.length}
        </Text>
      </View>

      <View style={styles.dots}>
        {media.map((m, i) => (
          <View key={m.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'rgba(0,0,0,0.06)' },
  countPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  countText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: COLORS.white, width: 18 },
});
