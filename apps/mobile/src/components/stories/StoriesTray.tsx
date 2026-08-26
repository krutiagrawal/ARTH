import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { useStoryFeed } from '../../hooks/useApiQueries';
import { useMarkStoryViewed } from '../../hooks/useSocialQueries';
import { resolveMediaUrl } from '../../api/client';
import { StoryViewer } from './StoryViewer';

interface StoriesTrayProps {
  /** Heading above the row. Pass null to hide it where the screen already has one. */
  title?: string | null;
  /** Set on dark surfaces (the Community tab) so labels stay readable. */
  tone?: 'onDark' | 'onLight';
}

/**
 * Horizontal tray of friends and followed NGOs with active stories.
 *
 * A group with something unseen gets the full gradient ring; once every story in it has been
 * viewed the ring goes flat grey — the same read/unread signal every story product uses, driven
 * by the server's `hasUnseen`. The API already sorts unseen groups first.
 */
export function StoriesTray({ title = "Today's stories", tone = 'onDark' }: StoriesTrayProps) {
  const { data: feed = [] } = useStoryFeed();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const markViewed = useMarkStoryViewed();

  if (feed.length === 0) return null;

  const active = activeIndex !== null ? feed[activeIndex] : null;
  const onDark = tone === 'onDark';

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={[styles.title, !onDark && styles.titleOnLight]}>{title}</Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {feed.map((group, i) => {
          const logoUri = resolveMediaUrl(group.author.imageUrl);
          return (
            <TouchableOpacity
              key={`${group.author.kind}:${group.author.id}`}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => setActiveIndex(i)}
            >
              <LinearGradient
                colors={
                  group.hasUnseen
                    ? [COLORS.golden, COLORS.sage, COLORS.forest]
                    : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.22)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ring}
              >
                <View style={styles.avatarInner}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{group.author.avatarEmoji ?? '🌱'}</Text>
                  )}
                </View>
              </LinearGradient>

              <Text
                style={[styles.name, !onDark && styles.nameOnLight]}
                numberOfLines={1}
              >
                {group.author.kind === 'ngo' ? group.author.name : group.author.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {active && (
        <StoryViewer
          visible
          stories={active.stories}
          authorName={active.author.name}
          authorAvatar={active.author.avatarEmoji ?? '🌱'}
          onView={(id) => markViewed.mutate(id)}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: COLORS.white,
    marginBottom: 10,
  },
  titleOnLight: { color: COLORS.textPrimary },
  row: { gap: 14, paddingRight: 8 },
  item: { alignItems: 'center', width: 70 },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 28 },
  name: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  nameOnLight: { color: COLORS.textSecondary },
});
