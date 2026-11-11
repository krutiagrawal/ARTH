import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GroupScreen } from '../components/groups/GroupScreen';
import { GroupAvatar, groupTypeLabel } from '../components/groups/GroupBits';
import { ApiError } from '../api/client';
import { useGroup, useRequestToJoinGroup, useRespondToGroupInvitation } from '../hooks/useGroupQueries';

/** A group as seen from outside (or inside): who they are, and the one action that fits the viewer. */
export function GroupDetailScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const group = useGroup(groupId);
  const join = useRequestToJoinGroup();
  const respond = useRespondToGroupInvitation();
  const [error, setError] = useState('');
  const g = group.data;

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      await group.refetch();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const action = () => {
    if (!g) return null;
    if (g.viewer.role) {
      return <AnimatedButton label="Open group" variant="primary" fullWidth onPress={() => navigation.replace('GroupMain', { groupId })} />;
    }
    const pending = g.viewer.pendingRequest;
    if (pending?.kind === 'invitation') {
      return (
        <View style={styles.row}>
          <AnimatedButton label="Accept invitation" variant="primary" style={styles.flex} onPress={() => run(() => respond.mutateAsync({ requestId: pending.id, action: 'accept' }))} />
          <AnimatedButton label="Decline" variant="ghost" onPress={() => run(() => respond.mutateAsync({ requestId: pending.id, action: 'decline' }))} />
        </View>
      );
    }
    if (pending?.kind === 'join_request') {
      return <AnimatedButton label="Request sent. Waiting for an admin" variant="secondary" fullWidth disabled onPress={() => {}} />;
    }
    return (
      <AnimatedButton
        label={join.isPending ? 'Sending…' : 'Ask to join'}
        variant="primary"
        fullWidth
        disabled={join.isPending || g.memberCount >= g.maxMembers}
        onPress={() => run(() => join.mutateAsync(groupId))}
      />
    );
  };

  return (
    <GroupScreen title={g?.name ?? 'Group'} onBack={() => navigation.goBack()} refetch={[group.refetch]}>
      {!g ? (
        <Text style={styles.muted}>{group.isError ? 'This group could not be found.' : 'Loading…'}</Text>
      ) : (
        <>
          <BorderCard style={styles.hero}>
            <GroupAvatar group={g} size={84} />
            <Text style={styles.name}>{g.name}</Text>
            <Text style={styles.handle}>@{g.handle}</Text>
            <Text style={styles.meta}>
              {[groupTypeLabel(g.groupType), g.city, `${g.memberCount}/${g.maxMembers} members`].filter(Boolean).join(' · ')}
            </Text>
            <Text style={styles.about}>{g.description}</Text>
          </BorderCard>
          <View style={{ height: 16 }} />
          {action()}
          {g.memberCount >= g.maxMembers && !g.viewer.role && <Text style={styles.muted}>This group is full right now.</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8, textAlign: 'center' },
  handle: { fontSize: 13, color: COLORS.textMuted },
  meta: { fontSize: 12, color: COLORS.earth, marginTop: 2, textAlign: 'center' },
  about: { fontSize: 14, color: COLORS.textPrimary, marginTop: 12, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex: { flex: 1 },
  muted: { color: COLORS.textMuted, textAlign: 'center', marginTop: 16 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 12, textAlign: 'center' },
});
