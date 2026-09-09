import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { SPACING } from '../../constants/theme';
import { useStoryViewers } from '../../hooks/useApiQueries';

/** "3h", "2d", "12 Mar" — matches PostCard's relativeTime formatting. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function StoryViewersSheet({
  visible,
  storyId,
  onClose,
}: {
  visible: boolean;
  storyId: string | null;
  onClose: () => void;
}) {
  const { data: viewers, isLoading } = useStoryViewers(storyId ?? undefined);

  return (
    <Sheet visible={visible} onClose={onClose} title="Viewed by" variant="slideUp" surface="dark" scrollable>
      {isLoading ? (
        <ActivityIndicator color={ON_DARK_SURFACE.primary} style={styles.spinner} />
      ) : !viewers || viewers.length === 0 ? (
        <Text style={styles.empty}>No views yet.</Text>
      ) : (
        viewers.map((v) => (
          <View key={v.userId} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{v.avatarEmoji}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {v.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                @{v.handle} · {relativeTime(v.viewedAt)}
              </Text>
            </View>
            {v.liked && <Text style={styles.heart}>❤️</Text>}
          </View>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: SPACING.lg },
  empty: {
    color: ON_DARK_SURFACE.secondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: ON_DARK_SURFACE.primary },
  meta: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 1 },
  heart: { fontSize: 16 },
});
