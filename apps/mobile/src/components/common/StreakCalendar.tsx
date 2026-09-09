import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { BorderCard } from './BorderCard';
import type { StreakWeek } from '../../api/streaks';

/**
 * Weekly streak grid — extracted from `ProfileScreen.tsx` so it can be reused for a
 * non-`User` streak (e.g. an NGO's weekly-update streak), which passes its own `weeks`/
 * `streakCurrent` data through the same props. Purely presentational, no data fetching.
 */

/**
 * The calendar API always returns a rolling window ending exactly today (backend:
 * `startDate = today - (weeksCount*7 - 1)`, sequential days from there) — so today's real
 * calendar date for any (weekIndex, dayIndex) cell can be derived client-side without the API
 * needing to send dates. Used to tell "missed" (past, not done) apart from "future" (not
 * reached yet) and to mark today's cell, none of which the raw boolean grid alone can express.
 */
export function classifyStreakDay(weekIndex: number, dayIndex: number, totalWeeks: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = totalWeeks * 7;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalDays - 1));
  const date = new Date(startDate);
  date.setDate(date.getDate() + (weekIndex * 7 + dayIndex));

  return {
    isToday: date.getTime() === today.getTime(),
    isFuture: date.getTime() > today.getTime(),
  };
}

export function StreakCalendar({ streakCurrent, weeks }: { streakCurrent: number; weeks: StreakWeek[] }) {
  return (
    <BorderCard style={styles.streakCalCard}>
      <View style={styles.streakCalHeader}>
        <View>
          <Text style={styles.streakCalTitleDark}>Streak Calendar</Text>
          <Text style={styles.streakCalSubDark}>Current: {streakCurrent} days 🔥</Text>
        </View>
        <View style={styles.streakCountBadge}>
          <Text style={styles.streakCountNum}>{streakCurrent}</Text>
          <Text style={styles.streakCountFire}>🔥</Text>
        </View>
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.streakWeek}>
          <Text style={styles.streakWeekLabelDark}>{week.week.replace('Week ', 'W')}</Text>
          <View style={styles.streakDays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, di) => {
              const done = week.days[di];
              const { isToday, isFuture } = classifyStreakDay(wi, di, weeks.length);
              const missed = !done && !isFuture && !isToday;
              return (
                <View key={di} style={styles.streakDayWrapper}>
                  <View
                    style={[
                      styles.streakDay,
                      done ? styles.streakDayFilled : missed ? styles.streakDayMissed : styles.streakDayEmpty,
                      isToday && styles.streakDayToday,
                    ]}
                  >
                    {done && <Text style={styles.streakDayCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.streakDayLabelDark, isToday && styles.streakDayLabelToday]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </BorderCard>
  );
}

const styles = StyleSheet.create({
  streakCalCard: {
    gap: 12,
  },
  streakCalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  streakCalTitleDark: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  streakCalSubDark: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  streakCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakCountNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.streakFire,
  },
  streakCountFire: {
    fontSize: 20,
  },
  streakWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakWeekLabelDark: {
    width: 24,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  streakDays: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  streakDayWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  streakDay: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDayFilled: {
    backgroundColor: COLORS.sage,
  },
  streakDayEmpty: {
    backgroundColor: 'rgba(160,114,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(160,114,74,0.25)',
  },
  streakDayMissed: {
    backgroundColor: 'rgba(194,74,59,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(194,74,59,0.35)',
  },
  streakDayToday: {
    borderWidth: 2,
    borderColor: COLORS.golden,
  },
  streakDayCheck: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  streakDayLabelDark: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  streakDayLabelToday: {
    color: COLORS.golden,
    fontWeight: '800',
  },
});
