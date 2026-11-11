import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { EmptyState } from '../components/common/EmptyState';
import { GroupScreen } from '../components/groups/GroupScreen';
import { GroupRow, PersonAvatar, RolePill, SectionTitle } from '../components/groups/GroupBits';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';
import { useMyGroupRequests, useMyGroups, useRespondToGroupInvitation } from '../hooks/useGroupQueries';

/** Entry point for groups: the ones I'm in, invitations waiting on me, and ways to start or find one. */
export function GroupsScreen({ navigation }: any) {
  const groups = useMyGroups();
  const requests = useMyGroupRequests();
  const respond = useRespondToGroupInvitation();
  const confirm = useConfirm();

  const answer = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await respond.mutateAsync({ requestId, action });
    } catch (e) {
      confirm('Could not answer', e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const mine = groups.data ?? [];
  const invitations = requests.data?.invitations ?? [];
  const waiting = requests.data?.joinRequests ?? [];

  return (
    <GroupScreen
      title="Groups"
      subtitle="Plant together"
      onBack={() => navigation.goBack()}
      refetch={[groups.refetch, requests.refetch]}
    >
      <View style={styles.actions}>
        <AnimatedButton label="＋ Create group" size="sm" onPress={() => navigation.navigate('CreateGroup')} variant="primary" style={styles.actionButton} />
        <AnimatedButton label="🔍 Find groups" size="sm" onPress={() => navigation.navigate('GroupDiscover')} variant="secondary" style={styles.actionButton} />
      </View>

      {invitations.length > 0 && (
        <>
          <SectionTitle>Invitations</SectionTitle>
          <BorderCard noPadding>
            {invitations.map((inv, i) => (
              <View key={inv.id} style={i > 0 ? styles.divider : undefined}>
                <GroupRow group={inv.group} onPress={() => navigation.navigate('GroupDetail', { groupId: inv.group.id })} />
                <View style={styles.inviteFooter}>
                  {inv.invitedBy && <PersonAvatar person={inv.invitedBy} size={22} />}
                  <Text style={styles.inviteText} numberOfLines={1}>
                    {inv.invitedBy ? `${inv.invitedBy.name} invited you` : 'You were invited'}
                  </Text>
                  <AnimatedButton label="Accept" size="sm" onPress={() => answer(inv.id, 'accept')} />
                  <AnimatedButton label="Decline" size="sm" variant="ghost" onPress={() => answer(inv.id, 'decline')} />
                </View>
              </View>
            ))}
          </BorderCard>
        </>
      )}

      <SectionTitle>My groups</SectionTitle>
      {mine.length === 0 ? (
        <EmptyState
          icon="🌳"
          title="No groups yet"
          body="Start one with family, friends, your school or club, or find a group to join."
        />
      ) : (
        <BorderCard noPadding>
          {mine.map((g, i) => (
            <View key={g.id} style={i > 0 ? styles.divider : undefined}>
              <GroupRow
                group={g}
                right={g.myRole ? <RolePill role={g.myRole} /> : undefined}
                onPress={() => navigation.navigate('GroupMain', { groupId: g.id })}
              />
            </View>
          ))}
        </BorderCard>
      )}

      {waiting.length > 0 && (
        <>
          <SectionTitle>Waiting for approval</SectionTitle>
          <BorderCard noPadding>
            {waiting.map((r, i) => (
              <View key={r.id} style={i > 0 ? styles.divider : undefined}>
                <GroupRow group={r.group} onPress={() => navigation.navigate('GroupDetail', { groupId: r.group.id })} />
              </View>
            ))}
          </BorderCard>
        </>
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.sageLight },
  inviteFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  inviteText: { flex: 1, fontSize: 12, color: COLORS.textMuted },
});
