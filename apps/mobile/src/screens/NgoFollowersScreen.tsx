import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useNgoFollowers, useRemoveFollower } from '../hooks/useSocialQueries';
import type { ApiFollower } from '../api/ngoFollowers';
import { useConfirm } from '../context/ConfirmDialogContext';

function FollowerRow({ follower, onRemove }: { follower: ApiFollower; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{follower.user.avatarEmoji}</Text>
      </View>

      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {follower.user.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          @{follower.user.handle} · {follower.user.treesPlantedCount} trees planted
        </Text>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.75}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

/** The accepted-followers list, with search and a silent remove action. */
export function NgoFollowersScreen() {
  const [query, setQuery] = useState('');
  const clearance = useBottomNavClearance();
  const { data, isLoading, refetch, isRefetching } = useNgoFollowers({
    status: 'accepted',
    q: query.trim() || undefined,
  });
  const removeFollower = useRemoveFollower();
  const confirm = useConfirm();

  const confirmRemove = (follower: ApiFollower) => {
    confirm(
      `Remove ${follower.user.name}?`,
      'They will stop seeing your updates in their feed. They are not told, and they can follow you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFollower.mutate(follower.followId),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={COLORS.forest} />
      </View>
    );
  }

  const followers = data?.followers ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.search}
          placeholder="Search followers"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.count}>
        {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'follower' : 'followers'}
      </Text>

      <FlatList
        data={followers}
        keyExtractor={(f) => f.followId}
        renderItem={({ item }) => <FollowerRow follower={item} onRemove={() => confirmRemove(item)} />}
        contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <EmptyState
            icon="🌍"
            title={query ? 'No one matches that' : 'No followers yet'}
            body={
              query
                ? 'Try a different name or handle.'
                : 'Share drive photos and updates — people who follow you see them in their feed.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  searchIcon: { fontSize: 14 },
  search: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  count: {
    marginHorizontal: SPACING.md,
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  list: { padding: SPACING.md, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 21 },
  rowText: { flex: 1 },
  name: { fontFamily: FONTS.display, fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  removeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
});
