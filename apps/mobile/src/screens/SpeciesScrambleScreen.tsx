import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
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
import type { ApiGameReward, SpeciesScrambleState } from '../api/games';

export function SpeciesScrambleScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<SpeciesScrambleState>('species_scramble');
  const submit = useSubmitGame<SpeciesScrambleState>('species_scramble');
  const { error: errorHaptic, success } = useHaptics();

  const [typed, setTyped] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const words = game?.puzzle.words ?? [];
  const ready = words.length > 0 && words.every((w, i) => (typed[i] ?? '').trim().length === w.length);

  const setWord = (i: number, value: string) => {
    const next = [...typed];
    next[i] = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    setTyped(next);
  };

  const handleSubmit = async () => {
    if (!ready) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync({ words: words.map((_, i) => typed[i].trim()) });
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

  const result = game?.result ?? null;
  const squares = result ? result.review.map((r) => (r.given === r.answer ? '🟩' : '🟥')).join('') : '';

  return (
    <GameScreenShell
      title="Species Scramble"
      subtitle="Unscramble the plant names"
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          {finished && result ? (
            <>
              <GlassCard variant="sage" style={styles.card}>
                <Text style={styles.title}>
                  {result.correctCount} of {result.total} correct
                </Text>
                <Text style={styles.body}>You earned {game.xpAwarded} XP. New words arrive tomorrow.</Text>
                <AnimatedButton
                  label="View result"
                  onPress={() => setResultVisible(true)}
                  variant="secondary"
                  size="md"
                  fullWidth
                  style={{ marginTop: SPACING.md }}
                />
              </GlassCard>
              {words.map((w, i) => {
                const review = result.review[i];
                const ok = review.given === review.answer;
                return (
                  <GlassCard key={i} variant="light" style={styles.card}>
                    <Text style={styles.scrambled}>{w.scrambled}</Text>
                    <Text style={[styles.answerLine, { color: ok ? COLORS.sageDark : COLORS.danger }]}>
                      {ok ? '✓ ' : '✗ '}
                      {review.answer}
                      {!ok && review.given ? `  (you wrote ${review.given})` : ''}
                    </Text>
                  </GlassCard>
                );
              })}
            </>
          ) : (
            <>
              {words.map((w, i) => (
                <GlassCard key={i} variant="light" style={styles.card}>
                  <View style={styles.tileRow}>
                    {w.scrambled.split('').map((ch, k) => (
                      <View key={k} style={styles.tile}>
                        <Text style={styles.tileText}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.hint}>Hint: {w.hint}</Text>
                  <TextInput
                    value={typed[i] ?? ''}
                    onChangeText={(v) => setWord(i, v)}
                    placeholder={`${w.length} letters`}
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={w.length}
                    style={styles.input}
                  />
                </GlassCard>
              ))}
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <AnimatedButton
                label={submit.isPending ? 'Checking…' : 'Check answers'}
                onPress={handleSubmit}
                disabled={!ready || submit.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: SPACING.sm }}
              />
            </>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🔀"
            title="Species Scramble"
            summary={result ? `${result.correctCount}/${result.total} unscrambled` : ''}
            reward={reward}
            shareText={`ARTH Species Scramble 🔀 ${result?.correctCount ?? 0}/${result?.total ?? 0}\n${squares}`}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: SPACING.sm },
  tile: { width: 36, height: 42, borderRadius: RADIUS.sm, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
  tileText: { ...TEXT.subheading, color: COLORS.forestDeep },
  hint: { ...TEXT.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.sm },
  input: {
    ...TEXT.subheading,
    textAlign: 'center',
    letterSpacing: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,39,0.18)',
    paddingVertical: 10,
    color: COLORS.textPrimary,
  },
  scrambled: { ...TEXT.subheading, color: COLORS.textSecondary, letterSpacing: 4, textAlign: 'center' },
  answerLine: { ...TEXT.subheading, textAlign: 'center', marginTop: SPACING.xs },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginTop: SPACING.sm },
});
