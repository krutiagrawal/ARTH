import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { StoryRing, type StoryRingStatus } from '../common/StoryRing';
import { useSlideUp } from '../../hooks/useAnimations';
import { useRespondFriendRequest } from '../../hooks/useApiQueries';
import type { ApiFriend, ApiFriendRequest } from '../../api/friends';

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'a while ago';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** A single row in "Your Squad" — shared by the Community tab's preview and the full
 * FriendsListScreen, so both stay visually/behaviorally identical. */
export function FriendCard({ friend, index, onPress, storyRing }: { friend: ApiFriend; index: number; onPress: () => void; storyRing?: StoryRingStatus | null }) {
  const slideStyle = useSlideUp(index * 80, 20);
  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <View style={styles.friendCard}>
          <View style={styles.friendAvatarWrapper}>
            <StoryRing status={storyRing} size={48} borderRadius={16}>
              <View style={[styles.friendAvatar, { backgroundColor: COLORS.mintLight }]}>
                <Text style={styles.friendAvatarEmoji}>{friend.avatar}</Text>
              </View>
            </StoryRing>
            {friend.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.friendInfo}>
            <Text style={styles.friendNameDark}>{friend.name}</Text>
            <Text style={styles.friendStatsDark}>
              🌳 {friend.treesPlanted} trees · 🔥 {friend.streak} streak
            </Text>
            <Text style={styles.friendActiveDark}>
              {friend.isOnline ? '🟢 Online now' : `⏱ ${formatRelativeTime(friend.lastActive)}`}
            </Text>
          </View>
          <View style={styles.friendRight}>
            <LinearGradient
              colors={[COLORS.sageLight, COLORS.sage]}
              style={styles.friendLevelBadge}
            >
              <Text style={styles.friendLevelText}>Lv.{friend.forestLevel}</Text>
            </LinearGradient>
            <Text style={styles.friendArrowDark}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** A single row in "Friend Requests" — shared the same way as `FriendCard` above. */
export function FriendRequestRow({
  request,
  onPress,
  onAccepted,
  storyRing,
}: {
  request: ApiFriendRequest;
  onPress: () => void;
  onAccepted: (name: string) => void;
  storyRing?: StoryRingStatus | null;
}) {
  const respondMutation = useRespondFriendRequest();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.friendCard}>
        <StoryRing status={storyRing} size={48} borderRadius={16}>
          <View style={[styles.friendAvatar, { backgroundColor: COLORS.mintLight }]}>
            <Text style={styles.friendAvatarEmoji}>{request.from.avatar}</Text>
          </View>
        </StoryRing>
        <View style={styles.friendInfo}>
          <Text style={styles.friendNameDark}>{request.from.name}</Text>
          <Text style={styles.friendStatsDark}>wants to be your friend</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.requestAccept}
            onPress={() => respondMutation.mutate({ id: request.id, action: 'accept' }, { onSuccess: () => onAccepted(request.from.name) })}
            accessibilityRole="button"
            accessibilityLabel={`Accept friend request from ${request.from.name}`}
          >
            <Text style={styles.requestAcceptText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.requestDecline}
            onPress={() => respondMutation.mutate({ id: request.id, action: 'decline' })}
            accessibilityRole="button"
            accessibilityLabel={`Decline friend request from ${request.from.name}`}
          >
            <Text style={styles.requestDeclineText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  friendAvatarWrapper: {
    position: 'relative',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarEmoji: {
    fontSize: 26,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendNameDark: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  friendStatsDark: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  friendActiveDark: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  friendRight: {
    alignItems: 'center',
    gap: 6,
  },
  friendLevelBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  friendLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  friendArrowDark: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestAccept: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAcceptText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '700',
  },
  requestDecline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDeclineText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
