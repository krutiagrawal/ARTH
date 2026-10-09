import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { GameResultSheet } from '../components/games/GameResultSheet';
import { useTodayGame, useSubmitGame } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError } from '../api/client';
import type { ApiGameReward, SeedMemoryState } from '../api/games';

const FLIP_BACK_MS = 800;

export function SeedMemoryScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<SeedMemoryState>('seed_memory');
  const submit = useSubmitGame<SeedMemoryState>('seed_memory');
  const { light, success, error: errorHaptic } = useHaptics();

  const [open, setOpen] = useState<number[]>([]); // face-up, not yet matched (max 2)
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const startedAt = useRef<number | null>(null);
  const locked = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const cards = game?.puzzle.cards ?? [];

  const finish = async (finalMoves: number) => {
    const elapsed = startedAt.current ? Math.ceil((Date.now() - startedAt.current) / 1000) : 0;
    // The server rejects results faster than a person can flip cards, so never report less than that.
    const seconds = Math.max(4, elapsed, Math.ceil(finalMoves * 0.7));
    setMessage(null);
    try {
      const res = await submit.mutateAsync({ moves: finalMoves, seconds });
      if (res.reward) {
        setReward(res.reward);
        setResultVisible(true);
        success();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Could not save your result. Try again.');
    }
  };

  const flip = (i: number) => {
    if (finished || locked.current || submit.isPending) return;
    if (open.includes(i) || matched.includes(i)) return;
    if (startedAt.current === null) startedAt.current = Date.now();
    light();

    const nextOpen = [...open, i];
    setOpen(nextOpen);
    if (nextOpen.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    locked.current = true;
    const [a, b] = nextOpen;
    const isMatch = cards[a] === cards[b];
    timers.current.push(
      setTimeout(() => {
        if (isMatch) {
          const nextMatched = [...matched, a, b];
          setMatched(nextMatched);
          if (nextMatched.length === cards.length) finish(nextMoves);
        }
        setOpen([]);
        locked.current = false;
      }, isMatch ? 350 : FLIP_BACK_MS),
    );
  };

  const result = game?.result ?? null;

  return (
    <GameScreenShell
      title="Seed Memory"
      subtitle={finished ? 'Done for today' : `Moves: ${moves}`}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          {finished && result ? (
            <GlassCard variant="sage" style={styles.card}>
              <Text style={styles.title}>{game.status === 'won' ? 'Sharp memory!' : 'Matched them all'}</Text>
              <Text style={styles.body}>
                {result.moves} moves in {result.seconds}s (par {result.par}). You earned {game.xpAwarded} XP.
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
              <Text style={styles.intro}>
                Flip two cards at a time and match all {game.puzzle.pairs} pairs in {game.puzzle.par} moves or fewer.
              </Text>
              <View style={styles.grid}>
                {cards.map((emoji, i) => {
                  const faceUp = open.includes(i) || matched.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.85}
                      onPress={() => flip(i)}
                      style={[styles.card3, faceUp ? styles.faceUp : styles.faceDown, matched.includes(i) && styles.matched]}
                      accessibilityRole="button"
                      accessibilityLabel={faceUp ? emoji : 'Hidden card'}
                    >
                      <Text style={styles.cardEmoji}>{faceUp ? emoji : '🌱'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {message ? <Text style={styles.error}>{message}</Text> : null}
              {submit.isPending ? <Text style={styles.intro}>Saving…</Text> : null}
              {message && matched.length === cards.length ? (
                <AnimatedButton label="Retry saving" onPress={() => finish(moves)} variant="primary" size="md" fullWidth />
              ) : null}
            </>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🧩"
            title="Seed Memory"
            summary={result ? `${result.moves} moves in ${result.seconds}s` : ''}
            reward={reward}
            shareText={`ARTH Seed Memory 🧩 ${result?.moves ?? '-'} moves (par ${result?.par ?? game.puzzle.par})`}
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
  intro: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card3: { width: '22.5%', aspectRatio: 0.85, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  faceDown: { backgroundColor: COLORS.sage, borderColor: COLORS.sageDark },
  faceUp: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: COLORS.forest },
  matched: { backgroundColor: COLORS.mint, borderColor: COLORS.sageDark },
  cardEmoji: { fontSize: 32, lineHeight: 42 },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginTop: SPACING.md, textAlign: 'center' },
});
