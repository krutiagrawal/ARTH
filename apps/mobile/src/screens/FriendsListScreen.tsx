import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { Toast } from '../components/common/Toast';
import { FriendCard, FriendRequestRow } from '../components/social/FriendRow';
import { useSoundSystem } from '../hooks/useSoundSystem';
import { useFriends, useFriendRequests, useRingStatus } from '../hooks/useApiQueries';

type Mode = 'requests' | 'squad';

/**
 * The "See all" destination for both Friend Requests and Your Squad on the Community page —
 * one screen parameterized by `mode` since both are the same shape (search + a grouped list of
 * the same row components used in the Community preview).
 */
export function FriendsListScreen({ navigation, route }: any) {
  const mode: Mode = route?.params?.mode ?? 'squad';
  const insets = useSafeAreaInsets();
  const { playSound } = useSoundSystem();
  const [query, setQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: friends = [] } = useFriends();
  const { data: friendRequests = [] } = useFriendRequests();
  const ringStatus = useRingStatus({
    userIds: mode === 'squad' ? friends.map((f) => f.id) : friendRequests.map((r) => r.from.id),
  });

  const celebrateFriendAccepted = (name: string) => {
    setToastMessage(`Hey, you are now friends with ${name}!`);
    playSound('friendAccepted');
  };

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friends.filter((f) => f.name.toLowerCase().includes(q)) : friends;
  }, [friends, query]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friendRequests.filter((r) => r.from.name.toLowerCase().includes(q)) : friendRequests;
  }, [friendRequests, query]);

  const list = mode === 'squad' ? filteredFriends : filteredRequests;
  const totalCount = mode === 'squad' ? friends.length : friendRequests.length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title={mode === 'squad' ? 'Your Squad' : 'Friend Requests'}
        subtitle={`${totalCount} ${totalCount === 1 ? 'person' : 'people'}`}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <EmptyState
            icon={mode === 'squad' ? '🌲' : '📭'}
            title={query.trim() ? 'No matches' : mode === 'squad' ? 'Your forest is better with friends' : 'No pending requests'}
            body={query.trim() ? `No one matches "${query.trim()}".` : mode === 'squad' ? 'Search from Community to find people and grow together.' : "You're all caught up."}
          />
        ) : (
          <BorderCard noPadding style={styles.groupedList}>
            {mode === 'squad'
              ? filteredFriends.map((friend, i) => (
                  <React.Fragment key={friend.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <FriendCard
                      friend={friend}
                      index={i}
                      onPress={() => navigation.navigate('UserPublicProfile', { userId: friend.id })}
                      storyRing={ringStatus.data?.users[friend.id]}
                    />
                  </React.Fragment>
                ))
              : filteredRequests.map((request, i) => (
                  <React.Fragment key={request.id}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <FriendRequestRow
                      request={request}
                      onPress={() =>
                        navigation.navigate('UserPublicProfile', {
                          userId: request.from.id,
                          friendRequestId: request.id,
                          friendRequestFromName: request.from.name,
                        })
                      }
                      onAccepted={celebrateFriendAccepted}
                      storyRing={ringStatus.data?.users[request.from.id]}
                    />
                  </React.Fragment>
                ))}
          </BorderCard>
        )}
      </ScrollView>

      <Toast visible={!!toastMessage} message={toastMessage ?? ''} icon="🌱" onHide={() => setToastMessage(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 16 },
  groupedList: { marginBottom: 4 },
  rowDivider: { height: 1, backgroundColor: 'rgba(160,114,74,0.25)', marginHorizontal: 14 },
});
