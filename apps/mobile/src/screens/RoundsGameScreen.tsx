import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { GameResultSheet } from '../components/games/GameResultSheet';
import { ChoiceButton } from '../components/games/ChoiceButton';
import { useTodayGame, useSubmitGame } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError } from '../api/client';
import type { ApiGameReward, RoundsGameKey, RoundsGameState } from '../api/games';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * One screen for every "pick one option per round" game: Eco Quiz, True or Myth, CO₂ Duel,
 * Shadow Tree, Sort the Waste and Missing Words. The server decides the rounds and scores them;
 * this only renders a prompt, the options, and the review afterwards.
 */
function Visual({ emoji, silhouette }: { emoji: string; silhouette?: boolean }) {
  return (
    <View style={styles.visualWrap}>
      <Text style={styles.visualEmoji}>{emoji}</Text>
      {/* Shadow Tree: a dark wash over the emoji so only its shape and rough tone show through. */}
      {silhouette ? <View style={styles.visualShade} pointerEvents="none" /> : null}
    </View>
  );
}

export function RoundsGameScreen({ navigation, route }: any) {
  const gameKey: RoundsGameKey = route.params.gameKey;
  const { data: game, isLoading, isError, refetch } = useTodayGame<RoundsGameState>(gameKey);
  const submit = useSubmitGame<RoundsGameState>(gameKey);
  const { light, error: errorHaptic, success } = useHaptics();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const rounds = game?.puzzle.rounds ?? [];
  const current = rounds[index];
  const isLast = index === rounds.length - 1;
  const picked = answers[index];

  const choose = (optionIndex: number) => {
    light();
    const next = [...answers];
    next[index] = optionIndex;
    setAnswers(next);
  };

  const advance = async () => {
    if (picked === undefined) return;
    if (!isLast) {
      light();
      setIndex(index + 1);
      return;
    }
    setMessage(null);
    try {
      const res = await submit.mutateAsync({ answers });
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
  const squares = result ? result.review.map((r) => (r.chosen === r.correct ? '🟩' : '🟥')).join('') : '';

  return (
    <GameScreenShell
      title={game?.title ?? 'Daily game'}
      subtitle={finished ? 'Done for today' : rounds.length ? `Question ${index + 1} of ${rounds.length}` : undefined}
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
                <Text style={styles.body}>You earned {game.xpAwarded} XP. A fresh set arrives tomorrow.</Text>
                <AnimatedButton
                  label="View result"
                  onPress={() => setResultVisible(true)}
                  variant="secondary"
                  size="md"
                  fullWidth
                  style={{ marginTop: SPACING.md }}
                />
              </GlassCard>
              {rounds.map((round, ri) => {
                const review = result.review[ri];
                return (
                  <GlassCard key={ri} variant="light" style={styles.card}>
                    {round.visual ? <Visual emoji={round.visual.emoji} /> : null}
                    <Text style={styles.question}>{round.prompt}</Text>
                    {round.options.map((opt, oi) => (
                      <ChoiceButton
                        key={oi}
                        prefix={LETTERS[oi]}
                        label={opt}
                        tone={oi === review.correct ? 'correct' : oi === review.chosen ? 'wrong' : 'default'}
                      />
                    ))}
                    {review.explanation ? <Text style={styles.explanation}>{review.explanation}</Text> : null}
                  </GlassCard>
                );
              })}
            </>
          ) : current ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${((index + 1) / rounds.length) * 100}%` }]} />
              </View>
              <GlassCard variant="light" style={styles.card}>
                {current.visual ? <Visual emoji={current.visual.emoji} silhouette={current.visual.silhouette} /> : null}
                <Text style={styles.question}>{current.prompt}</Text>
              </GlassCard>
              {current.options.map((opt, oi) => (
                <ChoiceButton
                  key={oi}
                  prefix={LETTERS[oi]}
                  label={opt}
                  tone={picked === oi ? 'selected' : 'default'}
                  onPress={() => choose(oi)}
                />
              ))}
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <AnimatedButton
                label={isLast ? (submit.isPending ? 'Submitting…' : 'Finish') : 'Next'}
                onPress={advance}
                disabled={picked === undefined || submit.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={{ marginTop: SPACING.sm }}
              />
            </>
          ) : null}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon={game.icon}
            title={game.title}
            summary={result ? `${result.correctCount}/${result.total} correct` : ''}
            reward={reward}
            shareText={`ARTH ${game.title} ${game.icon} ${result?.correctCount ?? 0}/${result?.total ?? 0}\n${squares}`}
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
  question: { ...TEXT.subheading, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  explanation: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.xs },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginBottom: SPACING.sm },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(45,90,39,0.15)', marginBottom: SPACING.md, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.forest },
  visualWrap: { alignSelf: 'center', width: 120, height: 120, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, overflow: 'hidden' },
  visualEmoji: { fontSize: 72, lineHeight: 90 },
  visualShade: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(18,28,14,0.72)' },
});
