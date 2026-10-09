import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
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
import type { ApiGameReward, SpotDifferenceState } from '../api/games';

type CellTone = 'plain' | 'picked' | 'right' | 'wrong' | 'missed';

const TONE_STYLE: Record<CellTone, { backgroundColor: string; borderColor: string }> = {
  plain: { backgroundColor: 'rgba(255,255,255,0.85)', borderColor: 'rgba(45,90,39,0.15)' },
  picked: { backgroundColor: COLORS.mint, borderColor: COLORS.forest },
  right: { backgroundColor: COLORS.sage, borderColor: COLORS.sageDark },
  wrong: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  missed: { backgroundColor: COLORS.golden, borderColor: COLORS.golden },
};

function Grid({
  cells,
  size,
  cell,
  tones,
  onPress,
}: {
  cells: string[];
  size: number;
  cell: number;
  tones?: CellTone[];
  onPress?: (i: number) => void;
}) {
  return (
    <View style={{ width: cell * size + 4 * (size - 1), flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {cells.map((emoji, i) => (
        <TouchableOpacity
          key={i}
          disabled={!onPress}
          activeOpacity={0.8}
          onPress={() => onPress?.(i)}
          style={[styles.cell, { width: cell, height: cell }, TONE_STYLE[tones?.[i] ?? 'plain']]}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          <Text style={{ fontSize: cell * 0.55, lineHeight: cell * 0.7 }}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SpotDifferenceScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<SpotDifferenceState>('spot_difference');
  const submit = useSubmitGame<SpotDifferenceState>('spot_difference');
  const { light, error: errorHaptic, success } = useHaptics();
  const { width } = useWindowDimensions();

  const [picked, setPicked] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const size = game?.puzzle.size ?? 5;
  const need = game?.puzzle.differences ?? 3;
  const cell = Math.min(60, Math.floor((width - SPACING.md * 2 - 4 * (size - 1)) / size));

  const toggle = (i: number) => {
    if (finished) return;
    light();
    setMessage(null);
    setPicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : prev.length >= need ? prev : [...prev, i]));
  };

  const handleSubmit = async () => {
    if (picked.length !== need) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync({ cells: picked });
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
  const tones: CellTone[] | undefined = game
    ? game.puzzle.b.map((_, i) => {
        if (result) {
          const isDiff = result.cells.includes(i);
          const chose = result.chosen.includes(i);
          return isDiff && chose ? 'right' : isDiff ? 'missed' : chose ? 'wrong' : 'plain';
        }
        return picked.includes(i) ? 'picked' : 'plain';
      })
    : undefined;

  return (
    <GameScreenShell
      title="Spot the Difference"
      subtitle={finished ? 'Done for today' : `${picked.length} of ${need} picked`}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          <Text style={styles.label}>ORIGINAL</Text>
          <View style={styles.gridWrap}>
            <Grid cells={game.puzzle.a} size={size} cell={cell} />
          </View>

          <Text style={styles.label}>{finished ? 'WHAT CHANGED' : `TAP THE ${need} THINGS THAT CHANGED`}</Text>
          <View style={styles.gridWrap}>
            <Grid cells={game.puzzle.b} size={size} cell={cell} tones={tones} onPress={finished ? undefined : toggle} />
          </View>

          {finished && result ? (
            <GlassCard variant="sage" style={styles.card}>
              <Text style={styles.title}>{game.status === 'won' ? 'Sharp eyes!' : 'Not quite'}</Text>
              <Text style={styles.body}>
                Green = found, gold = missed, red = wrong guess. You earned {game.xpAwarded} XP.
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
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <AnimatedButton
                label={submit.isPending ? 'Checking…' : 'Check my picks'}
                onPress={handleSubmit}
                disabled={picked.length !== need || submit.isPending}
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
            icon="🔍"
            title="Spot the Difference"
            summary={game.status === 'won' ? 'Found all 3 changes' : 'Check what you missed above'}
            reward={reward}
            shareText={`ARTH Spot the Difference 🔍 ${game.status === 'won' ? '3/3' : 'missed'}`}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { ...TEXT.label, color: COLORS.sageDark, marginTop: SPACING.sm, marginBottom: SPACING.sm, textAlign: 'center' },
  gridWrap: { alignItems: 'center' },
  cell: { borderRadius: RADIUS.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: SPACING.md },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  body: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginTop: SPACING.sm, textAlign: 'center' },
});
