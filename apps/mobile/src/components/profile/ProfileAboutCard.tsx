import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { BorderCard } from '../common/BorderCard';
import { ProgressRing } from '../common/ProgressRing';
import {
  EXPERIENCE_TAG,
  SPECIES_OPTIONS,
  SPACE_OPTIONS,
  SUNLIGHT_OPTIONS,
  MOTIVATION_OPTIONS,
  type PersonalizeOption,
} from '../../constants/personalization';

interface ProfileAboutCardProps {
  firstName: string;
  experience?: string | null;
  interests: string[];
  plantingGoal?: number | null;
  treesThisYear?: number | null;
  bestStreak?: number | null;
  level?: number | null;
  /** Lifetime totals; null when the owner has hidden their stats. */
  treesTotal?: number | null;
  badges?: number | null;
  memberSince?: string | null;
  /** Own profile only (not exposed on public profiles). */
  co2Kg?: number | null;
  plantingSpace?: string[];
  homeSunlight?: string | null;
  motivation?: string[];
  isOwn: boolean;
  /** Own profile only: opens Edit Profile, used by the empty-state prompt. */
  onEdit?: () => void;
}

const lookup = (options: PersonalizeOption[], values: string[]) =>
  values.map((v) => options.find((o) => o.value === v)).filter((o): o is PersonalizeOption => !!o);

/** Whole months between `from` and now, at least 1, so a pace never divides by zero. */
function monthsSince(from: string): number {
  const d = new Date(from);
  const now = new Date();
  return Math.max(1, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
}

/** Collapsible "About" block under the profile header. Collapsed it is a single summary row; opened
 * it shows the planting goal, a stat grid (pace, impact, level, streak…), and what the person loves
 * and how they garden. Every part renders only when it has a value, so a viewer never sees empty
 * placeholders; the owner gets a prompt to fill the card in instead. */
export function ProfileAboutCard({
  firstName,
  experience,
  interests,
  plantingGoal,
  treesThisYear,
  bestStreak,
  level,
  treesTotal,
  badges,
  memberSince,
  co2Kg,
  plantingSpace = [],
  homeSunlight,
  motivation = [],
  isOwn,
  onEdit,
}: ProfileAboutCardProps) {
  const [open, setOpen] = useState(false);

  const tag = experience ? EXPERIENCE_TAG[experience] : null;
  const interestChips = lookup(SPECIES_OPTIONS, interests);
  const spaces = lookup(SPACE_OPTIONS, plantingSpace);
  const sunlight = lookup(SUNLIGHT_OPTIONS, homeSunlight ? [homeSunlight] : [])[0];
  const motivations = lookup(MOTIVATION_OPTIONS, motivation);
  const hasGoal = !!plantingGoal && treesThisYear != null;
  const hasStreak = !!bestStreak && bestStreak > 0;

  const pace =
    treesTotal != null && treesTotal > 0 && memberSince ? treesTotal / monthsSince(memberSince) : null;
  const paceText = pace == null ? null : pace >= 10 ? `${Math.round(pace)}` : pace.toFixed(1).replace(/\.0$/, '');

  const stats: { icon: string; value: string; label: string }[] = [];
  if (treesTotal != null && treesTotal > 0) stats.push({ icon: '🌳', value: String(treesTotal), label: 'Trees planted' });
  if (paceText) stats.push({ icon: '📈', value: paceText, label: 'Trees / month' });
  if (co2Kg != null && co2Kg > 0) stats.push({ icon: '🌍', value: `${co2Kg.toFixed(1)}kg`, label: 'CO₂ stored' });
  if (hasStreak) stats.push({ icon: '🔥', value: `${bestStreak}`, label: bestStreak === 1 ? 'Best streak day' : 'Best streak days' });
  if (level) stats.push({ icon: '⭐', value: `Lv ${level}`, label: 'Forest level' });
  if (badges != null && badges > 0) stats.push({ icon: '🏅', value: String(badges), label: 'Badges' });

  const hasSetup = spaces.length > 0 || !!sunlight || motivations.length > 0;
  const isEmpty = !tag && interestChips.length === 0 && !hasGoal && stats.length === 0 && !hasSetup;

  if (isEmpty) {
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

  // What the collapsed row hints at, so it is worth opening.
  const summary = [
    tag ? `${tag.icon} ${tag.label} gardener` : null,
    hasGoal ? `🎯 ${Math.round(progress * 100)}% of ${new Date().getFullYear()} goal` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.wrap}>
      <BorderCard>
        <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={styles.headerRow} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isOwn ? 'About my planting' : `About ${firstName}`}</Text>
            {!open && !!summary && <Text style={styles.summary} numberOfLines={1}>{summary}</Text>}
          </View>
          <View style={[styles.chevron, open && styles.chevronOpen]} />
        </TouchableOpacity>

        {open && (
          <View style={styles.body}>
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
                  <Text style={styles.goalLabel}>{new Date().getFullYear()} goal</Text>
                  <Text style={styles.goalText}>
                    {treesThisYear} of {plantingGoal} {plantingGoal === 1 ? 'tree' : 'trees'} planted
                  </Text>
                  <Text style={styles.goalHint}>
                    {treesThisYear! >= plantingGoal! ? 'Goal reached — amazing!' : `${plantingGoal! - treesThisYear!} to go`}
                  </Text>
                </View>
              </View>
            )}

            {tag && (
              <View style={[styles.tag, hasGoal && { marginTop: 14 }]}>
                <Text style={styles.tagText}>{tag.icon} {tag.label} gardener</Text>
              </View>
            )}

            {stats.length > 0 && (
              <View style={styles.grid}>
                {stats.map((s) => (
                  <View key={s.label} style={styles.cell}>
                    <Text style={styles.cellValue}>{s.icon} {s.value}</Text>
                    <Text style={styles.cellLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {interestChips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Loves</Text>
                <View style={styles.chips}>
                  {interestChips.map((o) => (
                    <View key={o.value} style={styles.chip}>
                      <Text style={styles.chipText}>{o.icon} {o.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hasSetup && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>My planting setup</Text>
                {(spaces.length > 0 || !!sunlight) && (
                  <View style={styles.chips}>
                    {spaces.map((o) => (
                      <View key={o.value} style={styles.chip}>
                        <Text style={styles.chipText}>{o.icon} {o.label}</Text>
                      </View>
                    ))}
                    {!!sunlight && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{sunlight.icon} {sunlight.label}</Text>
                      </View>
                    )}
                  </View>
                )}
                {motivations.length > 0 && (
                  <Text style={styles.motivation}>
                    Here for: {motivations.map((o) => o.label.toLowerCase()).join(', ')}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </BorderCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  title: { ...TEXT.subheading, color: COLORS.textPrimary },
  prompt: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  // Drawn rather than a text glyph, so it renders identically on every device font.
  chevron: {
    width: 9,
    height: 9,
    marginRight: 4,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.textSecondary,
    transform: [{ rotate: '45deg' }],
  },
  chevronOpen: { marginTop: 5, transform: [{ rotate: '-135deg' }] },
  body: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(139,107,71,0.15)' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  goalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  goalText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  goalHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  tag: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.15)' },
  tagText: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cell: { width: '48.5%', backgroundColor: 'rgba(94,133,80,0.08)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  cellValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cellLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginTop: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.15)' },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.sageDark },
  motivation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
