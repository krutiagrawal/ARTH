import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { ProgressRing } from '../common/ProgressRing';
import { StatDisplay } from '../common/StatDisplay';
import { StoryRing, type StoryRingStatus } from '../common/StoryRing';

export interface ProfileHeaderStat {
  value: string | number;
  label: string;
  onPress?: () => void;
}

export interface ProfileHeaderAction {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: 'solid' | 'outline' | 'pending' | 'destructive';
  /** Optional leading glyph, e.g. "✎" for an edit action. */
  icon?: string;
}

interface ProfileHeaderProps {
  /** NGO/Nursery logo, or a user/group photo — omit to fall back to `avatarEmoji`. */
  avatarUrl?: string | null;
  avatarEmoji?: string;
  /** 0-1 XP ring progress + level badge, overlaid on the avatar — User profiles only. */
  xpProgress?: { progress: number; level: number } | null;
  /** Sage = has an unseen story, brown = seen, omitted = no active story. Mutually exclusive
   * with `xpProgress` in practice — pass this for other people's profiles, not your own. */
  storyRing?: StoryRingStatus | null;
  name: string;
  handle?: string | null;
  bio?: string | null;
  /** A single free-form line under the name, e.g. "📍 Pune · est. 2020" or "🌱 Planting since Mar 2024". */
  meta?: string | null;
  stats: ProfileHeaderStat[];
  primaryAction?: ProfileHeaderAction | null;
  /** Explanatory line under the action button, e.g. "This NGO approves each follower." */
  hint?: string | null;
}

export function ProfileHeader({
  avatarUrl,
  avatarEmoji,
  xpProgress,
  storyRing,
  name,
  handle,
  bio,
  meta,
  stats,
  primaryAction,
  hint,
}: ProfileHeaderProps) {
  const avatarBox = (
    <View style={styles.avatarShadowWrap}>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarEmoji}>{avatarEmoji ?? '🌱'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.avatarArea}>
        <StoryRing status={storyRing} size={92} borderRadius={24}>
          {avatarBox}
        </StoryRing>
        {xpProgress ? (
          <>
            <View style={styles.levelRing}>
              <ProgressRing
                size={104}
                strokeWidth={4}
                progress={xpProgress.progress}
                color={COLORS.golden}
                trackColor="rgba(0,0,0,0.08)"
              />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LV {xpProgress.level}</Text>
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.metaRow}>
        {handle ? (
          <View style={styles.handleChip}>
            <Text style={styles.handleChipText}>@{handle}</Text>
          </View>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {bio ? (
        <Text style={styles.bio} numberOfLines={4}>
          {bio}
        </Text>
      ) : null}

      <View style={styles.statsCard}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 ? <View style={styles.statDivider} /> : null}
            <TouchableOpacity
              style={styles.stat}
              onPress={s.onPress}
              disabled={!s.onPress}
              activeOpacity={s.onPress ? 0.7 : 1}
            >
              <StatDisplay value={s.value} label={s.label} size="md" align="center" />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {primaryAction ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            primaryAction.variant === 'outline' && styles.actionButtonOutline,
            primaryAction.variant === 'pending' && styles.actionButtonPending,
            primaryAction.variant === 'destructive' && styles.actionButtonDestructive,
          ]}
          onPress={primaryAction.onPress}
          disabled={primaryAction.busy}
          activeOpacity={0.85}
        >
          {primaryAction.icon ? (
            <Text
              style={[
                styles.actionButtonIcon,
                primaryAction.variant && primaryAction.variant !== 'solid' && styles.actionButtonTextMuted,
                primaryAction.variant === 'destructive' && styles.actionButtonTextDestructive,
              ]}
            >
              {primaryAction.icon}
            </Text>
          ) : null}
          <Text
            style={[
              styles.actionButtonText,
              primaryAction.variant && primaryAction.variant !== 'solid' && styles.actionButtonTextMuted,
              primaryAction.variant === 'destructive' && styles.actionButtonTextDestructive,
            ]}
          >
            {primaryAction.label}
          </Text>
        </TouchableOpacity>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
  },
  avatarArea: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  // Separate from `avatar` so the shadow isn't clipped by the avatar's own `overflow: hidden`.
  avatarShadowWrap: {
    borderRadius: 24,
    ...SHADOWS.sage,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.cream,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 42 },
  levelRing: { position: 'absolute', top: -6, left: -6 },
  levelBadge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: COLORS.golden,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: COLORS.cream,
    ...SHADOWS.golden,
  },
  levelBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white, letterSpacing: 0.4 },
  name: {
    fontFamily: FONTS.displayBold,
    fontSize: 23,
    lineHeight: 30,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  handleChip: {
    backgroundColor: COLORS.glassSageSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  handleChipText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  bio: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 300,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 2,
  },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingVertical: 11,
    paddingHorizontal: 28,
    minWidth: 180,
    ...SHADOWS.sm,
  },
  actionButtonOutline: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonPending: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1.5,
    borderColor: COLORS.amber,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonDestructive: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonIcon: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  actionButtonTextMuted: { color: COLORS.forest },
  actionButtonTextDestructive: { color: COLORS.coral },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 260,
  },
});
