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
import type { ApiGameReward, GroveWordState, LetterState } from '../api/games';

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const SQUARE: Record<LetterState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };
const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

const tileColors: Record<LetterState, string> = {
  correct: COLORS.sageDark,
  present: COLORS.golden,
  absent: '#8E8A80',
};

function shareText(game: GroveWordState): string {
  const rows = game.guesses.map((g) => g.letters.map((l) => SQUARE[l]).join('')).join('\n');
  return `ARTH Grove Word 🔤 ${game.status === 'won' ? game.guesses.length : 'X'}/${game.maxAttempts}\n${rows}`;
}

export function GroveWordScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<GroveWordState>('grove_word');
  const submit = useSubmitGameGuess<GroveWordState>('grove_word');
  const { light, error: errorHaptic, success } = useHaptics();

  // Measured size of the board area, so the tiles grow to use all the space above the keyboard.
  const [board, setBoard] = useState({ w: 0, h: 0 });
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const length = game?.puzzle.length ?? 5;

  // Best known state per letter, for coloring the on-screen keyboard.
  const keyStates: Record<string, LetterState> = {};
  game?.guesses.forEach((g) =>
    g.letters.forEach((state, i) => {
      const letter = g.word[i];
      if (!keyStates[letter] || RANK[state] > RANK[keyStates[letter]]) keyStates[letter] = state;
    }),
  );

  const press = (letter: string) => {
    if (finished || submit.isPending || typed.length >= length) return;
    light();
    setMessage(null);
    setTyped(typed + letter);
  };

  const backspace = () => {
    if (finished || submit.isPending) return;
    setMessage(null);
    setTyped(typed.slice(0, -1));
  };

  const enter = async () => {
    if (finished || submit.isPending) return;
    if (typed.length < length) {
      setMessage(`Enter a ${length}-letter word`);
      errorHaptic();
      return;
    }
    try {
      const res = await submit.mutateAsync(typed);
      setTyped('');
      if (res.reward) {
        setReward(res.reward);
        setResultVisible(true);
        success();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  const rows = game
    ? Array.from({ length: game.maxAttempts }, (_, r) => {
        const guess = game.guesses[r];
        if (guess) return { letters: guess.word.split(''), states: guess.letters as (LetterState | null)[] };
        if (r === game.guesses.length && !finished) {
          return { letters: typed.padEnd(length, ' ').split(''), states: Array(length).fill(null) as (LetterState | null)[] };
        }
        return { letters: Array(length).fill(' '), states: Array(length).fill(null) as (LetterState | null)[] };
      })
    : [];

  const gap = 6;
  const attempts = game?.maxAttempts ?? 6;
  // Largest square tile that fits both the width (5 across) and the height (6 down).
  const tileSize = Math.max(
    0,
    Math.min(68, (board.w - gap * (length - 1)) / length, (board.h - gap * (attempts - 1)) / attempts),
  );

  return (
    <GameScreenShell
      title="Grove Word"
      subtitle="Guess the 5-letter nature word"
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
      fill
    >
      {game ? (
        <>
          <View style={styles.board} onLayout={(e) => setBoard({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {rows.map((row, r) => (
              <View key={r} style={[styles.row, { marginBottom: r === rows.length - 1 ? 0 : gap }]}>
                {row.letters.map((letter, c) => {
                  const state = row.states[c];
                  return (
                    <View
                      key={c}
                      style={[
                        styles.tile,
                        { width: tileSize, height: tileSize, marginHorizontal: gap / 2 },
                        state ? { backgroundColor: tileColors[state], borderColor: tileColors[state] } : letter.trim() ? styles.tileFilled : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tileLetter,
                          { fontSize: Math.max(18, tileSize * 0.5), lineHeight: Math.max(22, tileSize * 0.6) },
                          state ? { color: COLORS.white } : null,
                        ]}
                      >
                        {letter.trim()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {message ? <Text style={styles.error}>{message}</Text> : null}

          {finished ? (
            <GlassCard variant="sage" style={styles.finishedCard}>
              <Text style={styles.finishedTitle}>{game.status === 'won' ? 'You got it!' : 'Out of guesses'}</Text>
              <Text style={styles.finishedBody}>
                Today's word was {game.answer}. You earned {game.xpAwarded} XP.
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
            <View style={styles.keyboard}>
              {KEY_ROWS.map((keys, i) => (
                <View key={keys} style={styles.keyRow}>
                  {i === 2 ? (
                    <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={enter} accessibilityLabel="Enter">
                      <Text style={styles.keyText}>ENTER</Text>
                    </TouchableOpacity>
                  ) : null}
                  {keys.split('').map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.key, keyStates[k] ? { backgroundColor: tileColors[keyStates[k]] } : null]}
                      onPress={() => press(k)}
                    >
                      <Text style={[styles.keyText, keyStates[k] ? { color: COLORS.white } : null]}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                  {i === 2 ? (
                    <TouchableOpacity style={[styles.key, styles.keyWide]} onPress={backspace} accessibilityLabel="Delete">
                      <Text style={styles.keyText}>⌫</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🔤"
            title="Grove Word"
            summary={game.status === 'won' ? `Solved in ${game.guesses.length}/${game.maxAttempts}` : `The word was ${game.answer ?? ''}`}
            reward={reward}
            shareText={shareText(game)}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  // Takes all the height above the keyboard; tiles are sized from its measured layout.
  board: { flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  row: { flexDirection: 'row' },
  tile: {
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(45,90,39,0.2)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFilled: { borderColor: COLORS.forest },
  tileLetter: { ...TEXT.statSmall, color: COLORS.textPrimary },
  error: { ...TEXT.bodySmall, color: COLORS.danger, textAlign: 'center', marginBottom: SPACING.sm },
  keyboard: { paddingTop: SPACING.xs },
  keyRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  // Letter keys share the row width equally, so the keyboard spans the full screen.
  key: {
    flex: 1,
    height: 56,
    marginHorizontal: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.5 },
  keyText: { ...TEXT.caption, fontWeight: '700', color: COLORS.textPrimary },
  finishedCard: { marginTop: SPACING.sm },
  finishedTitle: { ...TEXT.heading, color: COLORS.textPrimary },
  finishedBody: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
});
