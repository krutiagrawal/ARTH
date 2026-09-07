import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useMyGroups, useJoinGroup, useLeaveGroup } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { ApiError } from '../api/client';
import type { ApiGroupMembership } from '../api/group';
import { useConfirm } from '../context/ConfirmDialogContext';

const ROLE_LABEL: Record<ApiGroupMembership['role'], string> = { owner: 'Owner', co_admin: 'Co-admin', member: 'Member' };

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function GroupsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: memberships = [], isLoading } = useMyGroups();
  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const confirm = useConfirm();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setError(null);
    if (!inviteCode.trim()) return;
    try {
      await joinMutation.mutateAsync(inviteCode.trim());
      setInviteCode('');
      confirm('Joined!', "You're now part of this group.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not join with that code.');
    }
  };

  const handleLeave = (membership: ApiGroupMembership) => {
    confirm('Leave group?', `You'll lose access to ${membership.group.groupName}'s challenges.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate(membership.group.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Groups" subtitle="Plant with your people" onBack={() => navigation?.goBack?.()} align="left" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.joinRow}>
          <View style={{ flex: 1 }}>
            <FormField label="Invite code" value={inviteCode} onChangeText={setInviteCode} placeholder="e.g. AB3XQ9KP" autoCapitalize="characters" />
          </View>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <AnimatedButton
          label={joinMutation.isPending ? 'Joining…' : 'Join group'}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          gradientColors={[COLORS.forest, COLORS.forestDeep]}
          style={styles.joinButton}
        />

        <Text style={styles.sectionLabel}>Your groups</Text>

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && memberships.length === 0 && (
          <EmptyState icon="👥" title="No groups yet" body="Ask a family member, teacher, or club organizer for an invite code." />
        )}
        {memberships.map((m, i) => (
          <FadeInRow key={m.group.id} delay={i * 60}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GroupDetail', { groupId: m.group.id })}>
              <GlassCard variant="warm" style={styles.card} noPadding>
                <View style={styles.cardInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{m.group.groupName}</Text>
                    <Text style={styles.cardMeta}>{ROLE_LABEL[m.role]} · {m.group.city || 'No city set'}</Text>
                  </View>
                  {m.role !== 'owner' && (
                    <TouchableOpacity onPress={() => handleLeave(m)} style={styles.leaveButton}>
                      <Text style={styles.leaveText}>Leave</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          </FadeInRow>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinButton: { alignSelf: 'flex-start', marginTop: 4, marginBottom: 8 },
  error: { fontSize: 13, color: COLORS.coral, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 24, marginBottom: 8 },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  leaveButton: { paddingHorizontal: 10, paddingVertical: 6 },
  leaveText: { fontSize: 12, color: COLORS.coral, fontWeight: '700' },
});
