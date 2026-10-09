import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { GameResultSheet } from '../components/games/GameResultSheet';
import { useTodayGame, useSubmitGameGuess } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError } from '../api/client';
import type { ApiGameReward, ConnectionGroup, EcoConnectionsState } from '../api/games';

// Easiest to hardest, like the groups on the server.
const LEVEL_COLORS = ['#F2D16B', '#9FD38A', '#8CBCE8', '#B79AE0'];
const LEVEL_SQUARES = ['🟨', '🟩', '🟦', '🟪'];

function GroupRow({ group }: { group: ConnectionGroup }) {
  return (
    <View style={[styles.groupRow, { backgroundColor: LEVEL_COLORS[group.level] ?? COLORS.mint }]}>
      <Text style={styles.groupCategory}>{group.category}</Text>
      <Text style={styles.groupWords}>{group.words.join(', ')}</Text>
    </View>
  );
}

function shareText(game: EcoConnectionsState): string {
  const rows = game.guesses
    .map((g) => {
      const level = game.answer?.find((a) => a.words.every((w) => g.words.includes(w)))?.level;
      return g.result === 'correct' && level !== undefined ? LEVEL_SQUARES[level].repeat(4) : '⬛⬛⬛⬛';
    })
    .join('\n');
  return `ARTH Eco Connections 🔗 ${game.status === 'won' ? 'solved' : 'missed'}\n${rows}`;
}

export function EcoConnectionsScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<EcoConnectionsState>('eco_connections');
  const submit = useSubmitGameGuess<EcoConnectionsState>('eco_connections');
  const { light, error: errorHaptic, success } = useHaptics();

  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const groupSize = game?.puzzle.groupSize ?? 4;
  const solvedWords = new Set((game?.solved ?? []).flatMap((g) => g.words));
  const board = (game?.puzzle.words ?? []).filter((w) => !solvedWords.has(w));
  const mistakesLeft = game ? game.puzzle.maxMistakes - game.mistakes : 0;

  const toggle = (word: string) => {
    if (finished) return;
    light();
    setMessage(null);
    setSelected((prev) => (prev.includes(word) ? prev.filter((w) => w !== word) : prev.length >= groupSize ? prev : [...prev, word]));
  };

  const handleSubmit = async () => {
    if (selected.length !== groupSize) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync(selected);
      setSelected([]);
      const last = res.game.guesses[res.game.guesses.length - 1];
      if (res.reward) {
        setReward(res.reward);
        setResultVisible(true);
        success();
      } else if (last?.result === 'one_away') {
        setMessage('One away!');
        errorHaptic();
      } else if (last?.result === 'wrong') {
        setMessage('Not a group. Try again.');
        errorHaptic();
      } else {
        success();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <GameScreenShell
      title="Eco Connections"
      subtitle="Find the 4 hidden groups"
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          {(finished && game.answer ? game.answer : game.solved).map((group) => (
            <GroupRow key={group.category} group={group} />
          ))}

          {finished ? (
            <GlassCard variant="sage" style={styles.card}>
              <Text style={styles.title}>{game.status === 'won' ? 'All four found!' : 'Out of mistakes'}</Text>
              <Text style={styles.body}>You earned {game.xpAwarded} XP. A new board arrives tomorrow.</Text>
              <AnimatedButton
                label="View result"
                onPress={() => setResultVisible(true)}
                variant="secondary"
                size="md"
                fullWidth
                style={{ marginTop: SPACING.md }}
              />
            </GlassCard>
          ) : (
            <>
              <View style={styles.grid}>
                {board.map((word) => {
                  const on = selected.includes(word);
                  return (
                    <TouchableOpacity
                      key={word}
                      activeOpacity={0.85}
                      onPress={() => toggle(word)}
                      style={[styles.cell, on && styles.cellOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.cellText, on && styles.cellTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                        {word}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.mistakeRow}>
                <Text style={styles.mistakeLabel}>Mistakes left</Text>
                {Array.from({ length: game.puzzle.maxMistakes }, (_, i) => (
                  <View key={i} style={[styles.dot, i < mistakesLeft ? styles.dotOn : styles.dotOff]} />
                ))}
              </View>

              {message ? <Text style={styles.message}>{message}</Text> : null}

              <View style={styles.actions}>
                <AnimatedButton label="Clear" onPress={() => setSelected([])} disabled={selected.length === 0} variant="ghost" size="md" />
                <AnimatedButton
                  label={submit.isPending ? 'Checking…' : 'Submit'}
                  onPress={handleSubmit}
                  disabled={selected.length !== groupSize || submit.isPending}
                  variant="primary"
                  size="md"
                  style={{ flex: 1, marginLeft: SPACING.sm }}
                />
              </View>
            </>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🔗"
            title="Eco Connections"
            summary={game.status === 'won' ? `Solved with ${game.mistakes} mistake${game.mistakes === 1 ? '' : 's'}` : 'The groups are shown above'}
            reward={reward}
            shareText={shareText(game)}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: SPACING.sm },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  groupRow: { borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, alignItems: 'center' },
  groupCategory: { ...TEXT.label, color: COLORS.forestDeep },
  groupWords: { ...TEXT.bodySmall, color: COLORS.forestDeep, marginTop: 2, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.xs },
  cell: {
    width: '23.2%',
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,39,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cellOn: { backgroundColor: COLORS.forest, borderColor: COLORS.forestDeep },
  cellText: { ...TEXT.caption, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  cellTextOn: { color: COLORS.white },
  mistakeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.md },
  mistakeLabel: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginRight: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOn: { backgroundColor: COLORS.forest },
  dotOff: { backgroundColor: 'rgba(0,0,0,0.12)' },
  message: { ...TEXT.subheading, color: COLORS.dangerDark, textAlign: 'center', marginTop: SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
});
