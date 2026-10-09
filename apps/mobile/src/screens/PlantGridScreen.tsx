import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
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
import type { ApiGameReward, PlantGridState } from '../api/games';

export function PlantGridScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<PlantGridState>('plant_grid');
  const submit = useSubmitGameGuess<PlantGridState>('plant_grid');
  const { light, error: errorHaptic, success } = useHaptics();
  const { width } = useWindowDimensions();

  // Local edits, keyed by cell. `null` = empty. Seeded from the server (givens, or the last try).
  const [edits, setEdits] = useState<(number | null)[] | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const size = game?.puzzle.size ?? 4;
  const givens = game?.puzzle.givens ?? [];
  const symbols = game?.puzzle.symbols ?? [];
  const lastTry = game?.guesses[game.guesses.length - 1];

  const grid = useMemo<(number | null)[]>(() => {
    if (finished && game?.answer) return game.answer;
    return edits ?? lastTry?.grid ?? givens;
  }, [edits, finished, game?.answer, lastTry, givens]);

  const shownConflicts = edits ? conflicts : (lastTry?.conflicts ?? []);
  const attemptsLeft = game ? game.maxAttempts - game.guesses.length : 0;
  const complete = grid.length > 0 && grid.every((v) => v !== null);
  const cell = Math.min(72, Math.floor((width - SPACING.md * 2 - 6 * (size - 1)) / size));

  const place = (symbol: number | null) => {
    if (finished || selectedCell === null || givens[selectedCell] !== null) return;
    light();
    const next = [...grid];
    next[selectedCell] = symbol;
    setEdits(next);
    setConflicts(shownConflicts.filter((c) => c !== selectedCell));
    setMessage(null);
  };

  const handleCheck = async () => {
    if (!complete) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync(grid as number[]);
      const last = res.game.guesses[res.game.guesses.length - 1];
      if (res.reward) {
        setReward(res.reward);
        setResultVisible(true);
        success();
      } else if (last) {
        setEdits(last.grid);
        setConflicts(last.conflicts);
        setMessage(`${last.conflicts.length} squares clash. Plants must not repeat in a row or column.`);
        errorHaptic();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <GameScreenShell
      title="Plant Grid"
      subtitle={finished ? 'Done for today' : `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          <Text style={styles.intro}>
            Fill the grid so each plant appears once in every row and every column. Faded squares are already set.
          </Text>

          <View style={[styles.board, { width: cell * size + 6 * (size - 1) }]}>
            {grid.map((value, i) => {
              const locked = givens[i] !== null;
              const clash = !finished && shownConflicts.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  disabled={finished || locked}
                  activeOpacity={0.8}
                  onPress={() => {
                    light();
                    setSelectedCell(i);
                  }}
                  style={[
                    styles.cell,
                    { width: cell, height: cell },
                    locked && styles.cellLocked,
                    selectedCell === i && styles.cellSelected,
                    clash && styles.cellClash,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: cell * 0.5, lineHeight: cell * 0.65 }}>{value === null ? '' : symbols[value]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {finished ? (
            <GlassCard variant="sage" style={styles.card}>
              <Text style={styles.title}>{game.status === 'won' ? 'Perfect grid!' : 'Out of attempts'}</Text>
              <Text style={styles.body}>
                {game.status === 'won' ? '' : 'One valid solution is shown above. '}You earned {game.xpAwarded} XP.
              </Text>
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
              <View style={styles.palette}>
                {symbols.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => place(idx)}
                    style={[styles.paletteBtn, selectedCell === null && { opacity: 0.5 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.paletteEmoji}>{s}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity activeOpacity={0.8} onPress={() => place(null)} style={styles.paletteBtn} accessibilityRole="button">
                  <Text style={styles.paletteClear}>✕</Text>
                </TouchableOpacity>
              </View>
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <AnimatedButton
                label={submit.isPending ? 'Checking…' : 'Check grid'}
                onPress={handleCheck}
                disabled={!complete || submit.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: SPACING.md }}
              />
            </>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🟩"
            title="Plant Grid"
            summary={game.status === 'won' ? `Solved in ${game.guesses.length}/${game.maxAttempts}` : 'Better luck tomorrow'}
            reward={reward}
            shareText={`ARTH Plant Grid 🟩 ${game.status === 'won' ? game.guesses.length : 'X'}/${game.maxAttempts}`}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md, textAlign: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignSelf: 'center' },
  cell: {
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(45,90,39,0.2)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLocked: { backgroundColor: COLORS.mint, borderColor: COLORS.sage },
  cellSelected: { borderColor: COLORS.forest, borderWidth: 3 },
  cellClash: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  palette: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: SPACING.lg },
  paletteBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,39,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteEmoji: { fontSize: 28, lineHeight: 36 },
  paletteClear: { ...TEXT.subheading, color: COLORS.textSecondary },
  card: { marginTop: SPACING.md },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginTop: SPACING.md, textAlign: 'center' },
});
