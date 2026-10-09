import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { TEXT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GameScreenShell } from '../components/games/GameScreenShell';
import { RoundsPlayer } from '../components/games/RoundsPlayer';
import { RichText } from '../components/lesson/RichText';
import { LessonImage } from '../components/lesson/LessonImage';
import { useTodayGame, useSubmitGame } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import type { DailyLessonState } from '../api/games';

// How close to the bottom counts as "finished reading".
const END_THRESHOLD = 120;

export function DailyLessonScreen({ navigation }: any) {
  const { light } = useHaptics();
  const { data: game, isLoading, isError, refetch } = useTodayGame<DailyLessonState>('daily_lesson');
  const submit = useSubmitGame<DailyLessonState>('daily_lesson');

  const [phase, setPhase] = useState<'read' | 'quiz'>('read');
  const [reachedEnd, setReachedEnd] = useState(false);
  const [viewHeight, setViewHeight] = useState(0);
  // 0..1 through the article, for the thin reading-progress bar under the header.
  const [progress, setProgress] = useState(0);

  const finished = !!game && game.status !== 'in_progress' && game.status !== 'not_started';
  const lesson = game?.lesson ?? null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - END_THRESHOLD) setReachedEnd(true);
    const scrollable = contentSize.height - layoutMeasurement.height;
    setProgress(scrollable > 0 ? Math.min(1, Math.max(0, contentOffset.y / scrollable)) : 1);
  };

  // A short article may fit on screen with nothing to scroll, so it counts as read straight away.
  const onContentSizeChange = (_w: number, h: number) => {
    if (viewHeight > 0 && h <= viewHeight + END_THRESHOLD) setReachedEnd(true);
  };

  const startQuiz = () => {
    light();
    setPhase('quiz');
  };

  // Stay on the quiz view after finishing so the XP/streak sheet and the review are shown there.
  const showQuiz = phase === 'quiz';

  return (
    <GameScreenShell
      title="Daily Lesson"
      subtitle={finished ? 'Done for today' : showQuiz ? 'Quiz' : lesson?.tag}
      onBack={() => (showQuiz ? setPhase('read') : navigation.goBack())}
      loading={isLoading}
      error={isError || (!isLoading && !game)}
      onRetry={() => refetch()}
      fill
    >
      {game && !lesson ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No lesson today</Text>
          <Text style={styles.emptyBody}>Check back tomorrow for a new topic.</Text>
        </View>
      ) : game && lesson ? (
        <>
          {!showQuiz ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
            onScroll={onScroll}
            onContentSizeChange={onContentSizeChange}
            scrollEventThrottle={64}
          >
            {showQuiz ? (
              <RoundsPlayer
                title="Daily Lesson"
                icon="📘"
                shareLabel={lesson.title}
                puzzle={game.puzzle}
                result={game.result}
                finished={finished}
                xpAwarded={game.xpAwarded}
                submitting={submit.isPending}
                doneNote="A new lesson arrives tomorrow."
                onSubmit={async (answers) => (await submit.mutateAsync({ answers })).reward}
              />
            ) : (
              <>
                {lesson.heroImage ? <LessonImage image={lesson.heroImage} aspectRatio={16 / 10} /> : null}

                <View style={styles.titleBlock}>
                  <View style={styles.metaRow}>
                    <View style={styles.tagChip}>
                      <Text style={styles.tagText}>{lesson.tag.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.readTime}>
                      {lesson.emoji} {lesson.readMinutes} min read
                    </Text>
                  </View>
                  <Text style={styles.heroTitle}>{lesson.title}</Text>
                  <Text style={styles.heroSummary}>{lesson.summary}</Text>
                </View>

                {finished ? (
                  <GlassCard variant="golden" style={styles.doneCard}>
                    <Text style={styles.doneTitle}>
                      ✅ Done today · {game.result?.correctCount ?? 0}/{game.result?.total ?? 0} correct · +{game.xpAwarded} XP
                    </Text>
                    <TouchableOpacity onPress={() => setPhase('quiz')} accessibilityRole="button" accessibilityLabel="Review your quiz answers">
                      <Text style={styles.doneLink}>Review your answers →</Text>
                    </TouchableOpacity>
                  </GlassCard>
                ) : null}

                {lesson.sections.map((section, i) => (
                  <View key={i} style={styles.section}>
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                    {section.image ? <LessonImage image={section.image} /> : null}
                    <RichText body={section.body} />
                  </View>
                ))}

                {lesson.takeaway ? (
                  <GlassCard variant="golden" style={styles.takeaway}>
                    <Text style={styles.takeawayLabel}>💡 KEY TAKEAWAY</Text>
                    <Text style={styles.takeawayText}>{lesson.takeaway}</Text>
                  </GlassCard>
                ) : null}

                {lesson.sourceNote ? <Text style={styles.source}>Source: {lesson.sourceNote}</Text> : null}
              </>
            )}

            {finished && showQuiz ? (
              <AnimatedButton
                label="Back to the lesson"
                onPress={() => setPhase('read')}
                variant="ghost"
                size="md"
                fullWidth
                style={{ marginTop: SPACING.sm }}
              />
            ) : null}
          </ScrollView>

          {!finished && phase === 'read' ? (
            <View style={styles.bottomBar}>
              <AnimatedButton
                label={reachedEnd ? 'Take the quiz' : 'Keep reading to unlock the quiz'}
                onPress={startQuiz}
                disabled={!reachedEnd}
                variant="primary"
                size="lg"
                fullWidth
              />
              <Text style={styles.bottomHint}>5 questions · up to +{game.maxXp} XP · counts for your streak</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </GameScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.lg },
  progressTrack: { height: 3, backgroundColor: 'rgba(45,90,39,0.12)', marginBottom: SPACING.sm, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: COLORS.forest },
  titleBlock: { marginBottom: SPACING.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tagChip: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { ...TEXT.label, color: COLORS.white, fontSize: 10 },
  readTime: { ...TEXT.caption, color: COLORS.textSecondary },
  heroTitle: { ...TEXT.title, fontSize: 30, lineHeight: 38, color: COLORS.textPrimary, marginTop: SPACING.sm },
  heroSummary: { ...TEXT.body, fontSize: 18, lineHeight: 27, color: COLORS.textSecondary, marginTop: SPACING.sm },
  doneCard: { marginBottom: SPACING.md },
  doneTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  doneLink: { ...TEXT.bodySmall, color: COLORS.forest, fontWeight: '700', marginTop: SPACING.xs },
  section: { marginBottom: SPACING.lg },
  sectionHeading: { ...TEXT.title, fontSize: 23, lineHeight: 31, color: COLORS.forestDeep, marginBottom: SPACING.sm },
  takeaway: { marginTop: SPACING.xs },
  takeawayLabel: { ...TEXT.label, color: COLORS.textSecondary },
  takeawayText: { ...TEXT.subheading, color: COLORS.textPrimary, marginTop: SPACING.xs },
  source: { ...TEXT.caption, color: COLORS.textSecondary, marginTop: SPACING.md },
  bottomBar: { paddingTop: SPACING.sm },
  bottomHint: { ...TEXT.caption, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  emptyEmoji: { fontSize: 48, lineHeight: 60 },
  emptyTitle: { ...TEXT.heading, color: COLORS.textPrimary, marginTop: SPACING.sm },
  emptyBody: { ...TEXT.body, color: COLORS.textSecondary, marginTop: SPACING.xs },
});
