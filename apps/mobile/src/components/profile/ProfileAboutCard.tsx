import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { BorderCard } from '../common/BorderCard';
import { ProgressRing } from '../common/ProgressRing';
import { EXPERIENCE_TAG, SPECIES_OPTIONS } from '../../constants/personalization';

interface ProfileAboutCardProps {
  experience?: string | null;
  interests: string[];
  plantingGoal?: number | null;
  treesThisYear?: number | null;
  bestStreak?: number | null;
  isOwn: boolean;
  /** Own profile only: opens Edit Profile, used by the empty-state prompt. */
  onEdit?: () => void;
}

/** "About my planting" block under the profile header: experience level, favourite trees, this
 * year's planting-goal progress and best streak. Each part renders only when it has a value, so a
 * viewer never sees empty placeholders; the owner gets a prompt to fill the card in instead. */
export function ProfileAboutCard({
  experience,
  interests,
  plantingGoal,
  treesThisYear,
  bestStreak,
  isOwn,
  onEdit,
}: ProfileAboutCardProps) {
  const tag = experience ? EXPERIENCE_TAG[experience] : null;
  const interestChips = interests
    .map((v) => SPECIES_OPTIONS.find((o) => o.value === v))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const hasGoal = !!plantingGoal && treesThisYear != null;
  const hasStreak = !!bestStreak && bestStreak > 0;

  if (!tag && interestChips.length === 0 && !hasGoal && !hasStreak) {
    if (!isOwn) return null;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onEdit} style={styles.wrap}>
        <BorderCard>
          <Text style={styles.title}>🌱 Tell people about your planting</Text>
          <Text style={styles.prompt}>Add your experience, favourite trees and a yearly planting goal. Tap to set up →</Text>
        </BorderCard>
      </TouchableOpacity>
    );
  }

  const done = hasGoal ? Math.min(treesThisYear!, plantingGoal!) : 0;
  const progress = hasGoal ? done / plantingGoal! : 0;

  return (
    <View style={styles.wrap}>
      <BorderCard>
        {hasGoal && (
          <View style={styles.goalRow}>
            <ProgressRing
              size={64}
              strokeWidth={7}
              progress={progress}
              color={COLORS.sageDark}
              trackColor="rgba(160,114,74,0.2)"
              label={`${Math.round(progress * 100)}%`}
              delay={200}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>🎯 {new Date().getFullYear()} planting goal</Text>
              <Text style={styles.goalText}>
                {treesThisYear} of {plantingGoal} {plantingGoal === 1 ? 'tree' : 'trees'} planted
              </Text>
              <Text style={styles.goalHint}>
                {treesThisYear! >= plantingGoal! ? 'Goal reached — amazing!' : `${plantingGoal! - treesThisYear!} to go`}
              </Text>
            </View>
          </View>
        )}

        {(tag || hasStreak) && (
          <View style={[styles.chips, hasGoal && styles.chipsSpaced]}>
            {tag && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tag.icon} {tag.label} gardener</Text>
              </View>
            )}
            {hasStreak && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>🔥 Best streak {bestStreak} {bestStreak === 1 ? 'day' : 'days'}</Text>
              </View>
            )}
          </View>
        )}

        {interestChips.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Loves</Text>
            <View style={styles.chips}>
              {interestChips.map((o) => (
                <View key={o.value} style={styles.interest}>
                  <Text style={styles.interestText}>{o.icon} {o.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </BorderCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 16 },
  title: { ...TEXT.subheading, color: COLORS.textPrimary },
  prompt: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  goalHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsSpaced: { marginTop: 12 },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.15)' },
  tagText: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  interest: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  interestText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
});
