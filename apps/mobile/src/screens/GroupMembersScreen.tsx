import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useGroupMembers, useSetGroupMemberRole, useRemoveGroupMember } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import type { ApiGroupMember } from '../api/group';
import { useConfirm } from '../context/ConfirmDialogContext';

const ROLE_LABEL: Record<ApiGroupMember['role'], string> = { owner: 'Owner', co_admin: 'Co-admin', member: 'Member' };

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function GroupMembersScreen({ navigation }: any) {
  const { data: members = [], isLoading } = useGroupMembers();
  const setRole = useSetGroupMemberRole();
  const removeMember = useRemoveGroupMember();
  const confirm = useConfirm();

  const openActions = (member: ApiGroupMember) => {
    if (member.role === 'owner') return;
    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      member.role === 'member'
        ? { text: 'Make co-admin', onPress: () => setRole.mutate({ userId: member.userId, role: 'co_admin' }) }
        : { text: 'Remove co-admin', onPress: () => setRole.mutate({ userId: member.userId, role: 'member' }) },
      {
        text: 'Remove from group',
        style: 'destructive',
        onPress: () =>
          confirm('Remove member?', `${member.name} will lose access to this group.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeMember.mutate(member.userId) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ];
    confirm(member.name, undefined, options);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
      {!isLoading && members.length === 0 && (
        <EmptyState icon="👥" title="No members yet" body="Share your invite code from the Home tab to bring people in." />
      )}
      {members.map((m, i) => (
        <FadeInRow key={m.userId} delay={i * 60}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => openActions(m)} disabled={m.role === 'owner'}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.avatar}>{m.avatarEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{m.name}</Text>
                  <Text style={styles.cardMeta}>@{m.handle} · {ROLE_LABEL[m.role]}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.countText}>{m.treesPlantedCount} trees</Text>
                  <Text style={styles.dateText}>{m.xp} XP</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </FadeInRow>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  countText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
