import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { TYPOGRAPHY } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SectionHeader } from '../components/common/SectionHeader';
import { GlassCard } from '../components/common/GlassCard';
import { BorderCard } from '../components/common/BorderCard';
import { IconBadge } from '../components/common/IconBadge';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { ImpactStatsCard } from '../components/common/ImpactStatsCard';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { ShareCardModal } from '../components/common/ShareCardModal';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import { useAuth } from '../context/AuthContext';
import { useEcoFacts } from '../hooks/useApiQueries';
import {
  ECO_HERO,
  WHY_IT_MATTERS,
  INDIA_FORESTS,
  ONE_TREE_POWER,
  HOW_PLANTING_HELPS,
  ECO_CTA,
  EcoFact,
} from '../constants/ecoInsightsContent';

const HERO_HEIGHT = 220;

type PillKey = 'why' | 'india' | 'tree' | 'help' | 'facts';

const PILLS: { key: PillKey; icon: string; label: string }[] = [
  { key: 'why', icon: '🌍', label: 'Why It Matters' },
  { key: 'india', icon: '🇮🇳', label: "India's Forests" },
  { key: 'tree', icon: '🌳', label: "One Tree's Power" },
  { key: 'help', icon: '🌱', label: 'How You Help' },
  { key: 'facts', icon: '💡', label: 'Did You Know' },
];

function FactCard({ fact }: { fact: EcoFact }) {
  return (
    <GlassCard variant="sage" style={styles.factCard}>
      <View style={styles.factTopRow}>
        <IconBadge icon={fact.icon} color={COLORS.forest} size={40} />
        <Text style={styles.factStat}>{fact.stat}</Text>
      </View>
      <Text style={styles.factHeadline}>{fact.headline}</Text>
      <Text style={styles.factBody}>{fact.body}</Text>
      <Text style={styles.factSource}>{fact.source}</Text>
    </GlassCard>
  );
}

export function EcoInsightsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { light } = useHaptics();
  const { data: ecoFacts = [] } = useEcoFacts();
  const [activePill, setActivePill] = useState<PillKey>('why');
  const [impactShareVisible, setImpactShareVisible] = useState(false);

  const heroStyle = useFadeIn(0);
  const impactStyle = useSlideUp(100, 20);
  const contentStyle = useSlideUp(180, 20);
  const ctaStyle = useSlideUp(260, 20);

  const co2 = user?.totalCo2Absorbed ?? 0;
  const treesPlanted = user?.treesPlantedCount ?? 0;
  const streak = user?.streakCurrent ?? 0;

  const handlePillPress = (key: PillKey) => {
    light();
    setActivePill(key);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={GRADIENTS.mintFresh as any} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Eco Insights" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={heroStyle}>
          <LinearGradient colors={GRADIENTS.deepForest as any} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FloatingParticles type="leaf" count={7} areaHeight={HERO_HEIGHT} speedMultiplier={1.4} />
            <Text style={styles.heroKicker}>{ECO_HERO.kicker}</Text>
            <Text style={styles.heroHeadline}>{ECO_HERO.headline}</Text>
            <Text style={styles.heroBody}>{ECO_HERO.body}</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.section, impactStyle]}>
          <View style={styles.impactHeaderRow}>
            <SectionHeader icon="📊" title="YOUR IMPACT" />
            <TouchableOpacity
              onPress={() => setImpactShareVisible(true)}
              style={styles.shareIconButton}
              accessibilityRole="button"
              accessibilityLabel="Share your impact"
            >
              <Text style={styles.shareIcon}>📤</Text>
            </TouchableOpacity>
          </View>
          <ImpactStatsCard
            co2={co2}
            treesPlanted={treesPlanted}
            daysActive={streak}
            stats={[
              { value: `${co2.toFixed(1)}kg`, label: 'CO₂ Absorbed' },
              { value: treesPlanted, label: 'Trees Planted' },
              { value: streak, label: 'Day Streak' },
            ]}
          />
        </Animated.View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {PILLS.map((pill) => {
              const active = pill.key === activePill;
              return (
                <TouchableOpacity
                  key={pill.key}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => handlePillPress(pill.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                    {pill.icon} {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Animated.View key={activePill} style={[styles.section, contentStyle]}>
          {activePill === 'why' && WHY_IT_MATTERS.map((fact) => <FactCard key={fact.headline} fact={fact} />)}
          {activePill === 'india' && INDIA_FORESTS.map((fact) => <FactCard key={fact.headline} fact={fact} />)}
          {activePill === 'tree' && ONE_TREE_POWER.map((fact) => <FactCard key={fact.headline} fact={fact} />)}

          {activePill === 'help' && (
            <BorderCard style={styles.stepsCard}>
              {HOW_PLANTING_HELPS.map((step, i) => (
                <View key={step.title} style={[styles.stepRow, i > 0 && styles.stepDivider]}>
                  <IconBadge icon={step.icon} color={COLORS.sageDark} size={36} round />
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </BorderCard>
          )}

          {activePill === 'facts' && (
            ecoFacts.length > 0 ? (
              ecoFacts.map((fact, i) => (
                <GlassCard key={`${i}-${fact.slice(0, 12)}`} variant="warm" style={styles.factoidCard}>
                  <Text style={styles.factoidTag}>🌱</Text>
                  <Text style={styles.factoidText}>{fact}</Text>
                </GlassCard>
              ))
            ) : (
              <Text style={styles.emptyText}>Fresh facts are on their way — check back soon.</Text>
            )
          )}
        </Animated.View>

        <Animated.View style={ctaStyle}>
          <LinearGradient colors={GRADIENTS.deepForest as any} style={styles.ctaCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.ctaHeadline}>{ECO_CTA.headline}</Text>
            <Text style={styles.ctaBody}>{ECO_CTA.body}</Text>
            <AnimatedButton
              label={ECO_CTA.buttonLabel}
              variant="golden"
              fullWidth
              size="lg"
              style={styles.ctaButton}
              onPress={() => navigation.navigate('PlantTree')}
            />
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      <ShareCardModal
        visible={impactShareVisible}
        onClose={() => setImpactShareVisible(false)}
        title="Share your impact"
        caption="Check out my environmental impact on ARTH 🌍"
      >
        <LinearGradient colors={GRADIENTS.deepForest as any} style={styles.impactShareFill}>
          <Text style={styles.impactShareKicker}>🌍 MY IMPACT</Text>
          <Text style={styles.impactShareHeadline}>{user?.name ? `${user.name}'s Forest` : 'My Forest'}</Text>
          <View style={styles.impactShareCardWrap}>
            <ImpactStatsCard
              co2={co2}
              treesPlanted={treesPlanted}
              daysActive={streak}
              stats={[
                { value: `${co2.toFixed(1)}kg`, label: 'CO₂ Absorbed' },
                { value: treesPlanted, label: 'Trees Planted' },
                { value: streak, label: 'Day Streak' },
              ]}
            />
          </View>
          <Text style={styles.impactShareWatermark}>🌱 Growing my impact with ARTH</Text>
        </LinearGradient>
      </ShareCardModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: SPACING.md,
    gap: SPACING.xl,
  },
  section: {
    gap: 0,
  },

  impactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 20,
  },

  impactShareFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  impactShareKicker: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.mintLight,
  },
  impactShareHeadline: {
    ...TYPOGRAPHY.display2,
    color: COLORS.white,
    marginTop: 8,
    textAlign: 'center',
  },
  impactShareCardWrap: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  impactShareWatermark: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: SPACING.xl,
  },

  heroCard: {
    minHeight: HERO_HEIGHT,
    borderRadius: RADIUS.xl,
    padding: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  heroKicker: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.mintLight,
  },
  heroHeadline: {
    ...TYPOGRAPHY.display2,
    color: COLORS.white,
    marginTop: 8,
  },
  heroBody: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 12,
  },

  pillRow: {
    gap: 8,
    paddingRight: 4,
  },
  pill: {
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(45, 90, 39, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: COLORS.forest,
    ...SHADOWS.sm,
  },
  pillText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  factCard: {
    marginBottom: 12,
  },
  factTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  factStat: {
    ...TYPOGRAPHY.numberSmall,
    color: COLORS.forest,
  },
  factHeadline: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  factBody: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  factSource: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  stepsCard: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
  },
  stepDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 107, 71, 0.18)',
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  stepBody: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  factoidCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  factoidTag: {
    fontSize: 16,
  },
  factoidText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    flex: 1,
  },
  emptyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  ctaCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOWS.lg,
  },
  ctaHeadline: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  ctaBody: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 8,
  },
  ctaButton: {
    marginTop: 18,
  },
});
