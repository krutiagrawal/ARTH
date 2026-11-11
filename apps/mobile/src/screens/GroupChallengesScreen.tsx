import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { OutlineChip } from '../components/common/OutlineChip';
import { Sheet } from '../components/common/Sheet';
import { GroupScreen } from '../components/groups/GroupScreen';
import { ProgressBar } from '../components/groups/GroupBits';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';
import { useCreateGroupChallenge, useDeleteGroupChallenge, useGroup, useGroupChallenges } from '../hooks/useGroupQueries';

const DURATIONS = [7, 14, 30, 90];
const STATUS_LABEL = { upcoming: 'Starts soon', active: 'Active', completed: 'Completed 🏆', ended: 'Ended' } as const;

/** Group challenges: "plant N trees by this date". Progress comes from the group's real plantings. */
export function GroupChallengesScreen({ navigation, groupId }: { navigation: any; groupId: string }) {
  const clearance = useBottomNavClearance();
  const confirm = useConfirm();
  const group = useGroup(groupId);
  const challenges = useGroupChallenges(groupId);
  const create = useCreateGroupChallenge(groupId);
  const remove = useDeleteGroupChallenge(groupId);
  const isAdmin = group.data?.viewer.role === 'admin';

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('10');
  const [days, setDays] = useState(14);
  const [error, setError] = useState('');

  const goalNumber = Number.parseInt(goal, 10);
  const valid = title.trim().length >= 2 && description.trim().length >= 1 && Number.isInteger(goalNumber) && goalNumber >= 1;

  const submit = async () => {
    setError('');
    const startsAt = new Date();
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goalTotal: goalNumber,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + days * 86_400_000).toISOString(),
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      setGoal('10');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the challenge. Please try again.');
    }
  };

  const confirmDelete = (id: string, name: string) =>
    confirm('Delete this challenge?', `“${name}” will be removed for everyone.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutateAsync(id).catch((e) => confirm('Could not delete', e instanceof ApiError ? e.message : 'Something went wrong.')),
      },
    ]);

  const list = challenges.data ?? [];

  return (
    <GroupScreen
      title="Challenges"
      subtitle="Plant together"
      onBack={() => navigation.goBack()}
      refetch={[challenges.refetch]}
      bottomPad={clearance}
      right={isAdmin ? <AnimatedButton label="＋ New" size="sm" onPress={() => setOpen(true)} /> : undefined}
    >
      {list.length === 0 ? (
        <EmptyState icon="🏆" title="No challenges yet" body={isAdmin ? 'Set a goal and get everyone planting.' : 'An admin can start one.'} />
      ) : (
        list.map((c) => (
          <BorderCard key={c.id} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.status}>{STATUS_LABEL[c.status]}</Text>
            </View>
            <Text style={styles.desc}>{c.description}</Text>
            <ProgressBar value={c.progress / c.goalTotal} />
            <Text style={styles.meta}>
              {Math.min(c.progress, c.goalTotal)} of {c.goalTotal} trees · {new Date(c.startsAt).toLocaleDateString()} to {new Date(c.endsAt).toLocaleDateString()}
            </Text>
            {isAdmin && (
              <Text style={styles.delete} onPress={() => confirmDelete(c.id, c.title)}>
                Delete
              </Text>
            )}
          </BorderCard>
        ))
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="New challenge" scrollable>
        <FormField label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Plant 20 trees this month" maxLength={80} />
        <FormField label="Description" required value={description} onChangeText={setDescription} placeholder="Why, where, how" multiline maxLength={300} />
        <FormField label="Trees to plant" required value={goal} onChangeText={(v) => setGoal(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={6} />
        <Text style={styles.label}>Runs for</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <OutlineChip key={d} label={`${d} days`} active={days === d} onPress={() => setDays(d)} />
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AnimatedButton
          label={create.isPending ? 'Starting…' : 'Start challenge'}
          onPress={submit}
          disabled={!valid || create.isPending}
          variant="primary"
          fullWidth
          style={{ marginTop: 14 }}
        />
      </Sheet>
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  status: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  desc: { fontSize: 13, color: COLORS.textMuted },
  meta: { fontSize: 12, color: COLORS.textMuted },
  delete: { fontSize: 12, fontWeight: '700', color: COLORS.danger, alignSelf: 'flex-end' },
  label: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10 },
});
