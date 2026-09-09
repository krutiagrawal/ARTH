import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useNgoFollowers,
} from '../hooks/useSocialQueries';
import type { ApiFollower } from '../api/ngoFollowers';

function RequestRow({
  request,
  onAccept,
  onDecline,
  busy,
}: {
  request: ApiFollower;
  onAccept: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{request.user.avatarEmoji}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>
            {request.user.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            @{request.user.handle} · {request.user.treesPlantedCount} trees planted
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.decline, busy && styles.busy]}
          onPress={onDecline}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accept, busy && styles.busy]}
          onPress={onAccept}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * The follow-request inbox. Only meaningful while the NGO's follow policy is "approval" — when
 * it is "open" there is nothing to approve, so the screen explains how to turn approval on
 * rather than showing a bare empty list.
 */
export function NgoFollowerRequestsScreen({ navigation }: any) {
  const clearance = useBottomNavClearance();
  const { data, isLoading, refetch, isRefetching } = useNgoFollowers({ status: 'pending' });
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();
  const busy = accept.isPending || decline.isPending;

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={COLORS.forest} />
      </View>
    );
  }

  const requests = data?.followers ?? [];
  const isOpenPolicy = data?.followPolicy === 'open';

  return (
    <View style={styles.container}>
      {isOpenPolicy && (
        <View style={styles.policyNote}>
          <Text style={styles.policyText}>
            Anyone can follow you instantly right now, so requests never queue up here. Switch to
            “Approve each follower” in Settings if you want to vet them.
          </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('NgoSettings')} activeOpacity={0.7}>
            <Text style={styles.policyLink}>Open settings →</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={requests}
        keyExtractor={(r) => r.followId}
        renderItem={({ item }) => (
          <RequestRow
            request={item}
            busy={busy}
            onAccept={() => accept.mutate(item.followId)}
            onDecline={() => decline.mutate(item.followId)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          isOpenPolicy ? null : (
            <EmptyState
              icon="📬"
              title="No pending requests"
              body="When someone asks to follow you, they will show up here for you to accept or decline."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  policyNote: {
    margin: SPACING.md,
    marginBottom: 0,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.mintLight,
    gap: 6,
  },
  policyText: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  policyLink: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  list: { padding: SPACING.md, gap: 10 },
  row: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    padding: 12,
    gap: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  actions: { flexDirection: 'row', gap: 10 },
  decline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    alignItems: 'center',
  },
  declineText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  accept: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
  },
  acceptText: { fontSize: 13, fontWeight: '800', color: COLORS.white },
  busy: { opacity: 0.5 },
});
