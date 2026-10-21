import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { BorderCard } from '../common/BorderCard';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useStreakStatus } from '../../hooks/useApiQueries';
import { isOrgAtRiskDays } from '../../api/orgStreaks';

/**
 * Overall weekly streak for NGO/nursery accounts: any activity counts (posts, drives, stock,
 * orders, lessons…), with freeze balance and a shortcut into StreakProtection to revive or protect,
 * and into the daily lesson, which also keeps the week alive.
 */
export function OrgStreakCard({ navigation }: { navigation: any }) {
  const { data: status } = useStreakStatus();
  if (!status) return null;

  const needsAction = status.revivable || (status.state === 'at_risk' && isOrgAtRiskDays());
  const subtitle = status.revivable
    ? 'You missed last week – revive it with a freeze or XP'
    : status.state === 'safe'
      ? 'This week is counted ✅'
      : status.state === 'at_risk'
        ? 'Do something this week to keep it going'
        : 'Any activity this week starts a new streak';

  return (
    <BorderCard style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.fire}>🔥</Text>
        <View style={styles.text}>
          <Text style={styles.title}>
            {status.streakCurrent} {status.streakCurrent === 1 ? 'week' : 'weeks'} streak
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.meta}>
            🧊 {status.streakFreezesAvailable}/{status.freezeCap} freezes · best {status.streakMax} weeks
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, needsAction ? styles.buttonPrimary : styles.buttonGhost]}
          onPress={() => navigation.navigate('StreakProtection')}
        >
          <Text style={[styles.buttonText, needsAction && styles.buttonTextPrimary]}>
            {status.revivable ? 'Revive streak' : status.state === 'safe' ? 'Streak details' : 'Protect streak'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={() => navigation.navigate('DailyLesson')}>
          <Text style={styles.buttonText}>📚 Daily lesson</Text>
        </TouchableOpacity>
      </View>
    </BorderCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fire: { fontSize: 32 },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md },
  buttonPrimary: { backgroundColor: COLORS.forest },
  buttonGhost: { borderWidth: 1.5, borderColor: COLORS.warmBrown },
  buttonText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  buttonTextPrimary: { color: '#fff' },
});
