import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { RADIUS, SPACING } from '../../constants/theme';
import { GlassCard } from '../common/GlassCard';
import { AnimatedButton } from '../common/AnimatedButton';
import { GameResultSheet } from './GameResultSheet';
import { ChoiceButton } from './ChoiceButton';
import { useHaptics } from '../../hooks/useHaptics';
import { ApiError } from '../../api/client';
import type { ApiGameReward, RoundsPuzzle, RoundsResult } from '../../api/games';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** A big emoji; `silhouette` washes it dark so only its shape and rough tone show (Shadow Tree). */
function Visual({ emoji, silhouette }: { emoji: string; silhouette?: boolean }) {
  return (
    <View style={styles.visualWrap}>
      <Text style={styles.visualEmoji}>{emoji}</Text>
      {silhouette ? <View style={styles.visualShade} pointerEvents="none" /> : null}
    </View>
  );
}

interface RoundsPlayerProps {
  title: string;
  icon: string;
  puzzle: RoundsPuzzle;
  result: RoundsResult | null;
  finished: boolean;
  xpAwarded: number;
  /** Sends the answers; resolves with the reward when the play is recorded. */
  onSubmit: (answers: number[]) => Promise<ApiGameReward | null>;
  submitting: boolean;
  /** Shown in the shared text, e.g. the lesson title. */
  shareLabel?: string;
  /** Wording for the "all done" card ("A fresh set arrives tomorrow."). */
  doneNote?: string;
}

/**
 * The one-question-at-a-time player used by every "pick one option per round" game and by the daily
 * lesson's quiz: progress bar, prompt, options, Next/Finish, and afterwards a full review with
 * explanations plus the XP/streak result sheet. The server scores; this only renders.
 */
export function RoundsPlayer({
  title,
  icon,
  puzzle,
  result,
  finished,
  xpAwarded,
  onSubmit,
  submitting,
  shareLabel,
  doneNote = 'A fresh set arrives tomorrow.',
}: RoundsPlayerProps) {
  const { light, error: errorHaptic, success } = useHaptics();
  const rounds = puzzle.rounds;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

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
      const earned = await onSubmit(answers);
      if (earned) {
        setReward(earned);
        setResultVisible(true);
        success();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  const squares = result ? result.review.map((r) => (r.chosen === r.correct ? '🟩' : '🟥')).join('') : '';
  const shareText = `ARTH ${title} ${icon} ${result?.correctCount ?? 0}/${result?.total ?? 0}${shareLabel ? ` · ${shareLabel}` : ''}\n${squares}`;

  return (
    <>
      {finished && result ? (
        <>
          <GlassCard variant="sage" style={styles.card}>
            <Text style={styles.title}>
              {result.correctCount} of {result.total} correct
            </Text>
            <Text style={styles.body}>
              You earned {xpAwarded} XP. {doneNote}
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
          <Text style={styles.counter}>
            Question {index + 1} of {rounds.length}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / rounds.length) * 100}%` }]} />
          </View>
          <GlassCard variant="light" style={styles.card}>
            {current.visual ? <Visual emoji={current.visual.emoji} silhouette={current.visual.silhouette} /> : null}
            <Text style={styles.question}>{current.prompt}</Text>
          </GlassCard>
          {current.options.map((opt, oi) => (
            <ChoiceButton key={oi} prefix={LETTERS[oi]} label={opt} tone={picked === oi ? 'selected' : 'default'} onPress={() => choose(oi)} />
          ))}
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <AnimatedButton
            label={isLast ? (submitting ? 'Submitting…' : 'Finish') : 'Next'}
            onPress={advance}
            disabled={picked === undefined || submitting}
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
        icon={icon}
        title={title}
        summary={result ? `${result.correctCount}/${result.total} correct` : ''}
        reward={reward}
        shareText={shareText}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  question: { ...TEXT.subheading, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  explanation: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.xs },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginBottom: SPACING.sm },
  counter: { ...TEXT.label, color: COLORS.sageDark, marginBottom: SPACING.xs },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(45,90,39,0.15)', marginBottom: SPACING.md, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.forest },
  visualWrap: { alignSelf: 'center', width: 120, height: 120, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, overflow: 'hidden' },
  visualEmoji: { fontSize: 72, lineHeight: 90 },
  visualShade: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(18,28,14,0.72)' },
});
