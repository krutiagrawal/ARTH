import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useStreakStatus } from '../../hooks/useApiQueries';

const SECTIONS: { icon: string; title: string; body: (n: { every: number; cap: number; xpCost: number }) => string }[] = [
  {
    icon: '🔥',
    title: 'What counts',
    body: () => 'Your streak is the number of days in a row you planted a tree or finished a daily game. One of the two is enough.',
  },
  {
    icon: '⚠️',
    title: 'Streak at risk',
    body: () => "You were active yesterday but haven't done anything yet today. Do one thing before the day ends to keep it going.",
  },
  {
    icon: '🧊',
    title: 'Streak freeze',
    body: ({ every, cap }) =>
      `A freeze covers today without planting or playing. You start with 2, earn another every ${every} days of streak, and can hold up to ${cap}.`,
  },
  {
    icon: '⚡',
    title: 'Spending XP',
    body: ({ xpCost }) => `No freezes left? ${xpCost} XP does the same job – to protect today, or to revive a missed day.`,
  },
  {
    icon: '💔',
    title: 'Missed a day',
    body: () =>
      'If you missed exactly one day, you can revive the streak with a freeze or XP and carry on from where you were. Miss two or more days and the streak starts over.',
  },
  {
    icon: '🏆',
    title: 'Your best streak',
    body: () => 'Your personal best is never lost, even when the current streak resets.',
  },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** "How streaks work" – live freeze/XP numbers on top, plain-language rules below. */
export function StreakInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: status, isLoading } = useStreakStatus();

  return (
    <Sheet visible={visible} onClose={onClose} title="How streaks work" scrollable>
      {isLoading || !status ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <Stat value={`${status.streakFreezesAvailable}/${status.freezeCap}`} label="Freezes left" />
            <Stat value={`${status.freezesUsed}`} label="Freezes used" />
            <Stat value={`${status.xpSavesUsed}`} label="Saved with XP" />
          </View>
          <Text style={styles.xpLine}>
            You have {status.xp} XP · a save costs {status.xpCost}
          </Text>

          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.section}>
              <Text style={styles.sectionIcon}>{s.icon}</Text>
              <View style={styles.sectionText}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionBody}>
                  {s.body({ every: status.freezeEarnEveryDays, cap: status.freezeCap, xpCost: status.xpCost })}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.forest },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  xpLine: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 4 },
  section: { flexDirection: 'row', gap: 12, marginTop: 14 },
  sectionIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  sectionText: { flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sectionBody: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, marginTop: 2 },
});
