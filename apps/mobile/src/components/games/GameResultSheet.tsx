import React from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { IconBadge } from '../common/IconBadge';
import { AnimatedButton } from '../common/AnimatedButton';
import { FloatingParticles } from '../common/FloatingParticles';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import type { ApiGameReward } from '../../api/games';

interface GameResultSheetProps {
  visible: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  /** One line describing how it went, e.g. "Solved in 3/6" or "4/5 correct". */
  summary: string;
  reward: ApiGameReward | null;
  /** Spoiler-free text for the share button. */
  shareText: string;
}

/** Shown once, right after a game is finished: XP earned, streak status, and a share button. */
export function GameResultSheet({ visible, onClose, icon, title, summary, reward, shareText }: GameResultSheetProps) {
  const handleShare = async () => {
    try {
      await Share.share({ message: shareText });
    } catch {
      // The user dismissing or the share sheet failing is not worth surfacing.
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} variant="fade">
      <View style={styles.content}>
        {reward?.won ? <FloatingParticles type="leaf" count={8} areaHeight={160} speedMultiplier={1.3} /> : null}
        <IconBadge icon={icon} color={COLORS.sage} size={56} round style={styles.icon} />
        <Text style={styles.title}>{reward?.won ? `${title} — nice one!` : `${title} — done for today`}</Text>
        <Text style={styles.summary}>{summary}</Text>

        {reward ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.xpBlueDark }]}>+{reward.xpAwarded}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.streakFire }]}>🔥 {reward.streakCurrent}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.note}>Your streak is safe for today. Come back tomorrow for a new puzzle.</Text>

        <AnimatedButton label="Share result" onPress={handleShare} variant="secondary" size="md" fullWidth style={styles.button} />
        <AnimatedButton label="Done" onPress={onClose} variant="primary" size="md" fullWidth style={styles.button} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingVertical: SPACING.md },
  icon: { marginBottom: SPACING.md },
  title: { ...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  summary: { ...TEXT.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  stat: { alignItems: 'center', paddingHorizontal: SPACING.lg },
  statValue: { ...TEXT.stat },
  statLabel: { ...TEXT.caption, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(0,0,0,0.12)' },
  note: { ...TEXT.bodySmall, color: COLORS.textSecondary, textAlign: 'center', marginVertical: SPACING.md },
  button: { marginTop: SPACING.sm },
});
