import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { GameResultSheet } from '../components/games/GameResultSheet';
import { ChoiceButton } from '../components/games/ChoiceButton';
import { useTodayGame, useSubmitGameGuess } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError } from '../api/client';
import type { ApiGameReward, GuessTreeState, TreeGuess, TreeDirection, TreeMatch } from '../api/games';

type Tone = 'match' | 'partial' | 'miss';

function toneOf(value: TreeMatch | TreeDirection): Tone {
  if (value === 'match') return 'match';
  return value === 'miss' ? 'miss' : 'partial';
}

const arrow = (d: TreeDirection) => (d === 'higher' ? ' ↑' : d === 'lower' ? ' ↓' : '');

function chipsFor(g: TreeGuess): { label: string; tone: Tone }[] {
  const { traits: t, feedback: f } = g;
  const kindLabel = t.kind.charAt(0).toUpperCase() + t.kind.slice(1);
  const heightLabel = t.heightBand.charAt(0).toUpperCase() + t.heightBand.slice(1);
  return [
    { label: kindLabel, tone: toneOf(f.kind) },
    { label: `${heightLabel}${arrow(f.height)}`, tone: toneOf(f.height) },
    { label: t.bearsFruit ? 'Fruit' : 'No fruit', tone: toneOf(f.bearsFruit) },
    { label: t.showyFlowers ? 'Showy flowers' : 'Plain flowers', tone: toneOf(f.showyFlowers) },
    { label: t.nativeToIndia ? 'Native' : 'Introduced', tone: toneOf(f.nativeToIndia) },
    { label: `${t.co2KgPerYear} kg CO₂${arrow(f.co2)}`, tone: toneOf(f.co2) },
  ];
}

const SQUARE: Record<Tone, string> = { match: '🟩', partial: '🟨', miss: '⬛' };

function shareText(game: GuessTreeState): string {
  const solved = game.status === 'won';
  const rows = game.guesses.map((g) => chipsFor(g).map((c) => SQUARE[c.tone]).join('')).join('\n');
  return `ARTH Guess the Tree 🌳 ${solved ? game.guesses.length : 'X'}/${game.maxAttempts}\n${rows}`;
}

function GuessRow({ guess }: { guess: TreeGuess }) {
  return (
    <GlassCard variant="light" style={styles.guessCard}>
      <Text style={styles.guessName}>
        {guess.emoji} {guess.name}
      </Text>
      <View style={styles.chipWrap}>
        {chipsFor(guess).map((chip, i) => (
          <View key={i} style={[styles.chip, chipStyles[chip.tone]]}>
            <Text style={[styles.chipText, chip.tone === 'miss' && { color: COLORS.textSecondary }]}>{chip.label}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function GuessTreeScreen({ navigation }: any) {
  const { data: game, isLoading, isError, refetch } = useTodayGame<GuessTreeState>('guess_tree');
  const submit = useSubmitGameGuess<GuessTreeState>('guess_tree');
  const { light, error: errorHaptic, success } = useHaptics();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<ApiGameReward | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';

  const matches = useMemo(() => {
    if (!game) return [];
    const guessed = new Set(game.guesses.map((g) => g.key));
    const q = query.trim().toLowerCase();
    return game.puzzle.choices.filter((c) => !guessed.has(c.key) && (!q || c.name.toLowerCase().includes(q))).slice(0, 8);
  }, [game, query]);

  const handleGuess = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      const res = await submit.mutateAsync(selected);
      setSelected(null);
      setQuery('');
      if (res.reward) {
        setReward(res.reward);
        setResultVisible(true);
        success();
      } else {
        light();
      }
    } catch (e) {
      errorHaptic();
      setMessage(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <GameScreenShell
      title="Guess the Tree"
      subtitle={game ? `Guess ${Math.min(game.attempts + (finished ? 0 : 1), game.maxAttempts)} of ${game.maxAttempts}` : undefined}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <>
          <Text style={styles.intro}>
            Pick a tree. Green means it matches today's tree, yellow means the answer is higher or lower than your guess.
          </Text>

          {game.guesses.map((g) => (
            <GuessRow key={g.key} guess={g} />
          ))}

          {finished ? (
            <GlassCard variant="sage" style={styles.finishedCard}>
              <Text style={styles.finishedTitle}>
                {game.status === 'won' ? 'You got it!' : 'Out of guesses'}
              </Text>
              {game.answer ? (
                <Text style={styles.finishedBody}>
                  Today's tree was {game.answer.emoji} {game.answer.name}. You earned {game.xpAwarded} XP.
                </Text>
              ) : null}
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
            <View style={styles.picker}>
              <TextInput
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setSelected(null);
                }}
                placeholder="Search for a tree…"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.search}
                autoCorrect={false}
              />
              {matches.map((c) => (
                <ChoiceButton
                  key={c.key}
                  prefix={c.emoji}
                  label={c.name}
                  tone={selected === c.key ? 'selected' : 'default'}
                  onPress={() => {
                    light();
                    setSelected(c.key);
                  }}
                />
              ))}
              {matches.length === 0 ? <Text style={styles.empty}>No trees match "{query}".</Text> : null}
              {message ? <Text style={styles.error}>{message}</Text> : null}
              <AnimatedButton
                label={submit.isPending ? 'Checking…' : 'Guess'}
                onPress={handleGuess}
                disabled={!selected || submit.isPending}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          )}

          <GameResultSheet
            visible={resultVisible}
            onClose={() => setResultVisible(false)}
            icon="🌳"
            title="Guess the Tree"
            summary={
              game.status === 'won'
                ? `Solved in ${game.guesses.length}/${game.maxAttempts}`
                : game.answer
                  ? `It was ${game.answer.name}`
                  : ''
            }
            reward={reward}
            shareText={shareText(game)}
          />
        </>
      ) : null}
    </GameScreenShell>
  );
}

const chipStyles = StyleSheet.create({
  match: { backgroundColor: COLORS.sageDark },
  partial: { backgroundColor: COLORS.golden },
  miss: { backgroundColor: 'rgba(0,0,0,0.08)' },
});

const styles = StyleSheet.create({
  intro: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  guessCard: { marginBottom: SPACING.sm },
  guessName: { ...TEXT.subheading, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  chipText: { ...TEXT.caption, color: COLORS.white },
  picker: { marginTop: SPACING.sm },
  search: {
    ...TEXT.body,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(45,90,39,0.18)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  empty: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  error: { ...TEXT.bodySmall, color: COLORS.danger, marginBottom: SPACING.sm },
  finishedCard: { marginTop: SPACING.sm },
  finishedTitle: { ...TEXT.heading, color: COLORS.textPrimary },
  finishedBody: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
});
