import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { GameResultSheet } from '../components/games/GameResultSheet';
import { ChoiceButton } from '../components/games/ChoiceButton';
import { useTodayGame, useSubmitGame } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError } from '../api/client';
import type { ApiGameReward, GrowOrderState } from '../api/games';

function shareText(game: GrowOrderState): string {
  const result = game.result;
  const squares = result ? result.chosenOrder.map((s, i) => (s === result.correctOrder[i] ? '🟩' : '🟥')).join('') : '';
  return `ARTH Grow Order 🪴 ${game.status === 'won' ? '✓' : '✗'}\n${squares}`;
}

export function GrowOrderScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<GrowOrderState>('grow_order');
  const submit = useSubmitGame<GrowOrderState>('grow_order');
  const { light, error: errorHaptic, success } = useHaptics();

  // Steps the user has tapped so far, in the order they tapped them.
  const [chosen, setChosen] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && (game.status === 'won' || game.status === 'lost');
  const steps = game?.puzzle.steps ?? [];
  const remaining = steps.filter((s) => !chosen.includes(s));
  const complete = steps.length > 0 && chosen.length === steps.length;

  const add = (step: string) => {
    light();
    setMessage(null);
    setChosen([...chosen, step]);
  };

  const undo = () => {
    light();
    setChosen(chosen.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!complete) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync({ order: chosen });
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

  return (
    <GameScreenShell
      title="Grow Order"
      subtitle={game?.puzzle.title}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          <Text style={styles.prompt}>{game.puzzle.prompt}</Text>

          {finished && game.result ? (
            <>
              <GlassCard variant="sage" style={styles.card}>
                <Text style={styles.title}>{game.status === 'won' ? 'Perfect order!' : 'Not quite'}</Text>
                <Text style={styles.body}>You earned {game.xpAwarded} XP. A new sequence arrives tomorrow.</Text>
                <AnimatedButton
                  label="View result"
                  onPress={() => setResultVisible(true)}
                  variant="secondary"
                  size="md"
                  fullWidth
                  style={{ marginTop: SPACING.md }}
                />
              </GlassCard>
              <Text style={styles.sectionLabel}>CORRECT ORDER</Text>
              {game.result.correctOrder.map((step, i) => (
                <ChoiceButton key={step} prefix={`${i + 1}`} label={step} tone="correct" />
              ))}
              {game.status === 'lost' ? (
                <>
                  <Text style={styles.sectionLabel}>YOUR ORDER</Text>
                  {game.result.chosenOrder.map((step, i) => (
                    <ChoiceButton
                      key={step}
                      prefix={`${i + 1}`}
                      label={step}
                      tone={step === game.result!.correctOrder[i] ? 'correct' : 'wrong'}
                    />
                  ))}
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>YOUR ORDER</Text>
              {steps.map((_, i) => (
                <ChoiceButton
                  key={i}
                  prefix={`${i + 1}`}
                  label={chosen[i] ?? 'Tap a step below'}
                  tone={chosen[i] ? 'selected' : 'default'}
                />
              ))}

              {remaining.length > 0 ? <Text style={styles.sectionLabel}>STEPS</Text> : null}
              {remaining.map((step) => (
                <ChoiceButton key={step} label={step} onPress={() => add(step)} />
              ))}

              {message ? <Text style={styles.error}>{message}</Text> : null}
              <View style={styles.actions}>
                <AnimatedButton label="Undo" onPress={undo} disabled={chosen.length === 0 || submit.isPending} variant="ghost" size="md" />
                <AnimatedButton
                  label={submit.isPending ? 'Checking…' : 'Check order'}
                  onPress={handleSubmit}
                  disabled={!complete || submit.isPending}
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
            icon="🪴"
            title="Grow Order"
            summary={game.status === 'won' ? 'Every step in the right place' : 'Check the correct order below'}
            reward={reward}
            shareText={shareText(game)}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  prompt: { ...TEXT.body, color: COLORS.textSecondary, marginBottom: SPACING.md },
  card: { marginBottom: SPACING.sm },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  sectionLabel: { ...TEXT.label, color: COLORS.sageDark, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginVertical: SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
});
