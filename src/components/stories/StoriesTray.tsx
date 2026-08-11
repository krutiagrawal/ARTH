import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { useStoryFeed } from '../../hooks/useApiQueries';
import { StoryViewer } from './StoryViewer';

/** Horizontal tray of friends who have active stories, each shown as an avatar inside a gradient
 * ring. Tapping opens the full-screen StoryViewer for that friend's stories. Renders nothing when
 * no friends have active stories. Self-contained — drop it anywhere (e.g. Community Friends tab). */
export function StoriesTray() {
  const { data: feed = [] } = useStoryFeed();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (feed.length === 0) return null;

  const active = activeIndex !== null ? feed[activeIndex] : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Friends' Forests</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {feed.map((group, i) => (
          <TouchableOpacity
            key={group.user.id}
            style={styles.item}
            activeOpacity={0.8}
            onPress={() => setActiveIndex(i)}
          >
            <LinearGradient
              colors={[COLORS.golden, COLORS.sage, COLORS.forest]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ring}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>{group.user.avatarEmoji}</Text>
              </View>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>
              {group.user.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {active && (
        <StoryViewer
          visible
          stories={active.stories}
          authorName={active.user.name}
          authorAvatar={active.user.avatarEmoji}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 10,
  },
  row: {
    gap: 14,
    paddingRight: 8,
  },
  item: {
    alignItems: 'center',
    width: 68,
  },
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
  },
  avatarEmoji: {
    fontSize: 28,
  },
  name: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
});
