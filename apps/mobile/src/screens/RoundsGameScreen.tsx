import React from 'react';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { RoundsPlayer } from '../components/games/RoundsPlayer';
import { useTodayGame, useSubmitGame } from '../hooks/useApiQueries';
import type { RoundsGameKey, RoundsGameState } from '../api/games';

/**
 * One screen for every "pick one option per round" game: Eco Quiz, True or Myth, CO₂ Duel, Shadow
 * Tree, Sort the Waste and Missing Words. The server decides the rounds and scores them; the
 * shared RoundsPlayer renders the prompt, options and review.
 */
export function RoundsGameScreen({ navigation, route }: any) {
  const gameKey: RoundsGameKey = route.params.gameKey;
  const { data: game, isLoading, isError, refetch } = useTodayGame<RoundsGameState>(gameKey);
  const submit = useSubmitGame<RoundsGameState>(gameKey);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';

  return (
    <GameScreenShell
      title={game?.title ?? 'Daily game'}
      subtitle={finished ? 'Done for today' : undefined}
      onBack={() => navigation.goBack()}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
    >
      {game ? (
        <RoundsPlayer
          title={game.title}
          icon={game.icon}
          puzzle={game.puzzle}
          result={game.result}
          finished={finished}
          xpAwarded={game.xpAwarded}
          submitting={submit.isPending}
          onSubmit={async (answers) => (await submit.mutateAsync({ answers })).reward}
        />
      ) : null}
    </GameScreenShell>
  );
}
