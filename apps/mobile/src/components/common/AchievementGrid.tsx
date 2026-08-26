import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Text } from './AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { GlassCard } from './GlassCard';
import { useScaleIn } from '../../hooks/useAnimations';
import type { ApiAchievement } from '../../api/achievements';

/**
 * Achievement/badge grid + detail modal — extracted from `ProfileScreen.tsx` so it can be reused
 * anywhere a `ApiAchievement[]` list needs the same unlocked/locked-tile treatment (e.g. an NGO's
 * achievement grid, which is the same generic shape: id/title/description/icon/rarity/unlocked/
 * progress/total). Purely presentational, no data fetching — the caller supplies `achievements`
 * and an `onSelect` handler for the detail modal.
 */

const { width: SW } = Dimensions.get('window');

const RARITY_COLORS: Record<string, [string, string]> = {
  common: [COLORS.sage, COLORS.sageDark],
  rare: [COLORS.xpBlue, COLORS.xpBlueDark],
  epic: [COLORS.coral, '#C0392B'],
  legendary: [COLORS.golden, COLORS.earth],
};

function AchievementItem({
  achievement,
  index,
  onPress,
}: {
  achievement: ApiAchievement;
  index: number;
  onPress: () => void;
}) {
  const scaleStyle = useScaleIn(index * 60);
  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <Animated.View style={scaleStyle}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={[styles.achievementCardDark, !achievement.unlocked && styles.achievementCardLockedDark]}>
          {achievement.unlocked ? (
            <LinearGradient colors={colors} style={styles.achievementIconBg}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.achievementIconBgLockedDark}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            </View>
          )}
          <Text style={[styles.achievementTitleDark, !achievement.unlocked && styles.achievementTitleLockedDark]}>
            {achievement.title}
          </Text>
          {!achievement.unlocked && achievement.progress !== undefined && achievement.total !== undefined && (
            <View style={styles.achievementProgressBar}>
              <View
                style={[
                  styles.achievementProgressFill,
                  { width: `${(achievement.progress! / achievement.total!) * 100}%` as any },
                ]}
              />
            </View>
          )}
          <View
            style={[
              styles.rarityDot,
              { backgroundColor: colors[0] },
              !achievement.unlocked && styles.rarityDotLocked,
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AchievementGrid({
  achievements,
  onSelect,
}: {
  achievements: ApiAchievement[];
  onSelect: (achievement: ApiAchievement) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? achievements : achievements.slice(0, 6);

  return (
    <View style={styles.achievementsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleDark}>Achievements</Text>
        <TouchableOpacity onPress={() => setShowAll(prev => !prev)}>
          <Text style={styles.seeAllDark}>{showAll ? 'Show less' : 'See all →'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.achievementGrid}>
        {displayed.map((achievement, i) => (
          <AchievementItem key={achievement.id} achievement={achievement} index={i} onPress={() => onSelect(achievement)} />
        ))}
      </View>
    </View>
  );
}

export function AchievementDetailModal({
  achievement,
  onClose,
}: {
  achievement: ApiAchievement | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!achievement} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e: any) => e.stopPropagation()}>
          {achievement && (
            <GlassCard variant="dark" style={styles.achievementModalCard}>
              <LinearGradient
                colors={RARITY_COLORS[achievement.rarity]}
                style={styles.achievementModalIconBg}
              >
                <Text style={styles.achievementModalIcon}>{achievement.icon}</Text>
              </LinearGradient>
              <Text style={styles.achievementModalTitle}>{achievement.title}</Text>
              <Text style={styles.achievementModalRarity}>{achievement.rarity.toUpperCase()}</Text>
              <Text style={styles.achievementModalDesc}>{achievement.description}</Text>
              {!achievement.unlocked && achievement.total !== undefined && (
                <View style={styles.achievementModalProgressWrap}>
                  <View style={styles.achievementProgressBar}>
                    <View
                      style={[
                        styles.achievementProgressFill,
                        { width: `${Math.min(100, (achievement.progress / achievement.total) * 100)}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.achievementModalProgressText}>
                    {achievement.progress} / {achievement.total}
                  </Text>
                </View>
              )}
              {achievement.unlocked && <Text style={styles.achievementModalUnlocked}>✓ Unlocked</Text>}
            </GlassCard>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  achievementsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAllDark: {
    fontSize: 13,
    color: COLORS.sageLight,
    fontWeight: '600',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementCardDark: {
    width: (SW - 32 - 24) / 3,
    alignItems: 'center',
    backgroundColor: 'rgba(13,35,24,0.45)',
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
  },
  achievementCardLockedDark: {
    backgroundColor: 'rgba(13,35,24,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  achievementIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIconBgLockedDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 22,
  },
  achievementTitleDark: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 13,
  },
  achievementTitleLockedDark: {
    color: COLORS.white,
  },
  achievementProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(200,200,200,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: COLORS.xpBlue,
    borderRadius: 2,
  },
  rarityDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rarityDotLocked: {
    opacity: 0.45,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  achievementModalCard: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  achievementModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementModalIcon: {
    fontSize: 32,
  },
  achievementModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  achievementModalRarity: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sageLight,
    letterSpacing: 1,
  },
  achievementModalDesc: {
    fontSize: 13,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  achievementModalProgressWrap: {
    width: '100%',
    marginTop: 14,
    gap: 6,
  },
  achievementModalProgressText: {
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
  },
  achievementModalUnlocked: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sageLight,
    marginTop: 14,
  },
});
