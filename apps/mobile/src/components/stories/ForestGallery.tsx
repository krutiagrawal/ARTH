import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useMyStories, useDeleteStory } from '../../hooks/useApiQueries';
import { resolveStoryImage } from '../../api/stories';
import { StoryViewer } from './StoryViewer';

const { width: SW } = Dimensions.get('window');
const GAP = 8;
const H_PADDING = 16 * 2; // ProfileScreen body horizontal padding (both sides)
const THUMB = (SW - H_PADDING - GAP * 2) / 3;

function isActive(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

/** Permanent gallery of the user's own forest snapshots, shown on their Profile. Every snapshot is
 * kept here forever (even after its 24h friend-facing story ring expires). Tap to view; delete from
 * the viewer. Renders nothing until the user has posted at least one story. */
export function ForestGallery() {
  const { data: stories = [] } = useMyStories();
  const deleteStoryMutation = useDeleteStory();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (stories.length === 0) return null;

  const activeCount = stories.filter((s) => isActive(s.expiresAt)).length;

  const handleDelete = (storyId: string) => {
    Alert.alert('Delete snapshot', 'Remove this forest snapshot from your gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteStoryMutation.mutate(storyId);
          setViewerIndex(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Forest Gallery</Text>
        {activeCount > 0 && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{activeCount} live</Text>
          </View>
        )}
      </View>
      <View style={styles.grid}>
        {stories.map((story, i) => (
          <TouchableOpacity
            key={story.id}
            activeOpacity={0.85}
            onPress={() => setViewerIndex(i)}
            style={styles.thumbWrap}
          >
            <Image source={{ uri: resolveStoryImage(story.imageUrl) }} style={styles.thumb} />
            {isActive(story.expiresAt) && <View style={styles.liveDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {viewerIndex !== null && (
        <StoryViewer
          visible
          stories={stories}
          initialIndex={viewerIndex}
          authorName="Your Forest"
          authorAvatar="🌳"
          onClose={() => setViewerIndex(null)}
          onDelete={handleDelete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    // Renders directly on ProfileScreen's cream background, not inside a dark card — must use
    // dark text (was COLORS.white, invisible on cream).
    color: COLORS.textPrimary,
  },
  liveBadge: {
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.golden,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
