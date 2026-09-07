import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import {
  useNurseryFollowers,
  useAcceptNurseryFollowRequest,
  useDeclineNurseryFollowRequest,
  useRemoveNurseryFollower,
} from '../hooks/useSocialQueries';
import type { ApiFollower } from '../api/nurseryFollowers';
import { useConfirm } from '../context/ConfirmDialogContext';

function FollowerRow({ follower, isPending, onAccept, onDecline, onRemove }: {
  follower: ApiFollower;
  isPending: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{follower.user.avatarEmoji}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>{follower.user.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>@{follower.user.handle} · {follower.user.treesPlantedCount} trees planted</Text>
      </View>
      {isPending ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function NurseryFollowersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'accepted' | 'pending'>('accepted');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useNurseryFollowers({ status: tab, q: query.trim() || undefined });
  const acceptMutation = useAcceptNurseryFollowRequest();
  const declineMutation = useDeclineNurseryFollowRequest();
  const removeMutation = useRemoveNurseryFollower();
  const confirm = useConfirm();

  const confirmRemove = (follower: ApiFollower) => {
    confirm(`Remove ${follower.user.name}?`, 'They will stop seeing your updates. They can follow you again later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(follower.followId) },
    ]);
  };

  const followers = data?.followers ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Followers" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setTab('accepted')} style={[styles.tab, tab === 'accepted' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'accepted' && styles.tabTextActive]}>Followers ({data && tab === 'accepted' ? data.total : ''})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('pending')} style={[styles.tab, tab === 'pending' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Requests {data?.pendingCount ? `(${data.pendingCount})` : ''}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput style={styles.search} placeholder="Search by name or handle" placeholderTextColor={COLORS.textMuted} value={query} onChangeText={setQuery} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(f) => f.followId}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          renderItem={({ item }) => (
            <FollowerRow
              follower={item}
              isPending={tab === 'pending'}
              onAccept={() => acceptMutation.mutate(item.followId)}
              onDecline={() => declineMutation.mutate(item.followId)}
              onRemove={() => confirmRemove(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🌿"
              title={tab === 'pending' ? 'No pending requests' : 'No followers yet'}
              body={tab === 'pending' ? 'New follow requests will show up here.' : 'Post updates so planters can find and follow you.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.md, paddingTop: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.08)' },
  tabActive: { backgroundColor: COLORS.forest },
  tabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  searchWrap: { marginHorizontal: SPACING.md, marginTop: 10, paddingHorizontal: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.sand },
  search: { paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  list: { padding: SPACING.md, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.mintLight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 21 },
  rowText: { flex: 1 },
  name: { fontFamily: FONTS.display, fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.forest },
  acceptText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  declineBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sand },
  declineText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sand },
  removeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
});
