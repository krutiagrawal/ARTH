import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { resolveMediaUrl } from '../api/client';
import { useBlocks, useUnblockTarget } from '../hooks/useSocialQueries';
import type { ApiBlock } from '../api/social';

/** Manage blocked people and organisations. Reachable from Settings. */
export function BlockedAccountsScreen({ navigation }: any) {
  const { data: blocks = [], isLoading, refetch, isRefetching } = useBlocks();
  const unblock = useUnblockTarget();

  const confirmUnblock = (block: ApiBlock) => {
    Alert.alert(`Unblock ${block.name}?`, 'You will start seeing their posts and stories again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () =>
          unblock.mutate(
            block.kind === 'ngo' ? { ngoId: block.targetId } : { userId: block.targetId },
          ),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Blocked accounts" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            blocks.length > 0 ? (
              <Text style={styles.intro}>
                Blocking works both ways — neither of you sees the other's posts or stories.
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const logo = resolveMediaUrl(item.logoUrl);
            return (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  {logo ? (
                    <Image source={{ uri: logo }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{item.avatarEmoji ?? '🚫'}</Text>
                  )}
                </View>

                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.kind === 'ngo' ? 'Organisation' : item.handle ? `@${item.handle}` : 'Person'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => confirmUnblock(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="🛡️"
              title="Nobody is blocked"
              body="If someone bothers you, use the ⋯ menu on their post to block them. They are never told."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, gap: 8 },
  intro: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.beige,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 20 },
  rowText: { flex: 1 },
  name: { fontFamily: FONTS.display, fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.forest,
  },
  unblockText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
});
