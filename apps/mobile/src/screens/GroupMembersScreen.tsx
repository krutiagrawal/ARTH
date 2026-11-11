import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { GroupScreen } from '../components/groups/GroupScreen';
import { PersonRow, RolePill, SectionTitle } from '../components/groups/GroupBits';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';
import type { ApiGroupMember } from '../api/plantingGroups';
import {
  useCancelGroupInvitation,
  useGroup,
  useGroupMembers,
  useGroupRequests,
  useInviteToGroup,
  useRemoveGroupMember,
  useRespondToGroupRequest,
  useSetGroupMemberRole,
} from '../hooks/useGroupQueries';

/** Members, join requests and invitations. Admins manage; everyone can see who is in and can leave. */
export function GroupMembersScreen({ navigation, groupId }: { navigation: any; groupId: string }) {
  const clearance = useBottomNavClearance();
  const { user } = useAuth();
  const confirm = useConfirm();
  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const isAdmin = group.data?.viewer.role === 'admin';
  const requests = useGroupRequests(groupId, isAdmin);
  const invite = useInviteToGroup(groupId);
  const respond = useRespondToGroupRequest(groupId);
  const cancelInvite = useCancelGroupInvitation(groupId);
  const setRole = useSetGroupMemberRole(groupId);
  const remove = useRemoveGroupMember(groupId);
  const [handle, setHandle] = useState('');
  const [notice, setNotice] = useState('');

  const fail = (e: unknown) => confirm('Could not do that', e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

  const sendInvite = async () => {
    setNotice('');
    try {
      await invite.mutateAsync(handle.trim().replace(/^@/, '').toLowerCase());
      setNotice(`Invitation sent to @${handle.trim().replace(/^@/, '')}.`);
      setHandle('');
    } catch (e) {
      fail(e);
    }
  };

  const openMemberMenu = (m: ApiGroupMember) => {
    if (m.userId === user?.id) return;
    confirm(
      m.user.name,
      m.role === 'admin' ? 'This person is an admin.' : 'This person is a member.',
      [
        {
          text: m.role === 'admin' ? 'Make regular member' : 'Make admin',
          onPress: () => setRole.mutateAsync({ userId: m.userId, role: m.role === 'admin' ? 'member' : 'admin' }).catch(fail),
        },
        ...(m.role === 'member'
          ? [{ text: 'Remove from group', style: 'destructive' as const, onPress: () => remove.mutateAsync(m.userId).catch(fail) }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const leave = () =>
    confirm('Leave this group?', 'You can ask to join again later.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(user!.id);
            navigation.goBack();
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);

  const list = members.data ?? [];
  const asked = (requests.data ?? []).filter((r) => r.kind === 'join_request');
  const invited = (requests.data ?? []).filter((r) => r.kind === 'invitation');
  const total = group.data?.memberCount ?? list.length;

  return (
    <GroupScreen
      title="Members"
      subtitle={`${total} of ${group.data?.maxMembers ?? 100}`}
      onBack={() => navigation.goBack()}
      refetch={[group.refetch, members.refetch, requests.refetch]}
      bottomPad={clearance}
      paged={members}
    >
      {isAdmin && (
        <>
          <SectionTitle>Invite someone</SectionTitle>
          <BorderCard>
            <FormField label="Their ARTH handle" value={handle} onChangeText={setHandle} placeholder="@handle" autoCapitalize="none" maxLength={31} />
            <AnimatedButton
              label={invite.isPending ? 'Sending…' : 'Send invitation'}
              size="sm"
              onPress={sendInvite}
              disabled={handle.trim().replace(/^@/, '').length < 3 || invite.isPending}
              variant="primary"
              fullWidth
              style={{ marginTop: 8 }}
            />
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </BorderCard>

          {asked.length > 0 && (
            <>
              <SectionTitle>Asking to join</SectionTitle>
              <BorderCard noPadding>
                {asked.map((r, i) => (
                  <View key={r.id} style={i > 0 ? styles.divider : undefined}>
                    <PersonRow
                      person={r.user}
                      right={
                        <View style={styles.pair}>
                          <AnimatedButton label="Approve" size="sm" onPress={() => respond.mutateAsync({ requestId: r.id, action: 'approve' }).catch(fail)} />
                          <AnimatedButton label="No" size="sm" variant="ghost" onPress={() => respond.mutateAsync({ requestId: r.id, action: 'decline' }).catch(fail)} />
                        </View>
                      }
                    />
                  </View>
                ))}
              </BorderCard>
            </>
          )}

          {invited.length > 0 && (
            <>
              <SectionTitle>Invitations sent</SectionTitle>
              <BorderCard noPadding>
                {invited.map((r, i) => (
                  <View key={r.id} style={i > 0 ? styles.divider : undefined}>
                    <PersonRow
                      person={r.user}
                      subtitle="Waiting for a reply"
                      right={<AnimatedButton label="Cancel" size="sm" variant="ghost" onPress={() => cancelInvite.mutateAsync(r.id).catch(fail)} />}
                    />
                  </View>
                ))}
              </BorderCard>
            </>
          )}
        </>
      )}

      <SectionTitle>Everyone</SectionTitle>
      <BorderCard noPadding>
        {list.map((m, i) => (
          <View key={m.id} style={i > 0 ? styles.divider : undefined}>
            <PersonRow
              person={m.user}
              right={
                <View style={styles.pair}>
                  <RolePill role={m.role} />
                  {isAdmin && m.userId !== user?.id && (
                    <TouchableOpacity onPress={() => openMemberMenu(m)} hitSlop={8}>
                      <Text style={styles.more}>⋯</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </View>
        ))}
      </BorderCard>

      <AnimatedButton label="Leave group" size="sm" variant="ghost" onPress={leave} style={{ marginTop: 20 }} />
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.warmBrown },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: { fontSize: 22, color: COLORS.textMuted, paddingHorizontal: 4 },
  notice: { color: COLORS.sageDark, fontSize: 13, marginTop: 8 },
});
