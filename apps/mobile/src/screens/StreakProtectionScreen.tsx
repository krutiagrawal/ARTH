import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Mascot } from '../components/common/Mascot';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { useHaptics } from '../hooks/useHaptics';
import { useAuth } from '../context/AuthContext';
import { useProtectStreak } from '../hooks/useApiQueries';

const { width: SW, height: SH } = Dimensions.get('window');

type ProtectionStage = 'warning' | 'choosing' | 'saved';

const XP_STREAK_SAVE_COST = 100;

function buildFreezeOptions(streakFreezesAvailable: number, xp: number) {
  return [
    {
      id: 'plant',
      title: 'Plant a Tree Now',
      subtitle: 'Upload a quick photo and save your streak instantly',
      icon: '🌱',
      cost: 'Free',
      recommended: true,
      disabled: false,
    },
    {
      id: 'freeze',
      title: 'Use Streak Freeze',
      subtitle: 'Skip one day without losing your streak.',
      icon: '🧊',
      cost: `${streakFreezesAvailable} remaining`,
      recommended: false,
      disabled: streakFreezesAvailable <= 0,
    },
    {
      id: 'xp',
      title: 'Spend XP Tokens',
      subtitle: `Use ${XP_STREAK_SAVE_COST} XP points to protect today's streak`,
      icon: '⚡',
      cost: `${XP_STREAK_SAVE_COST} XP`,
      recommended: false,
      disabled: xp < XP_STREAK_SAVE_COST,
    },
  ];
}

function HeartAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.heartEmoji, style]}>🔥</Animated.Text>
  );
}

function StreakCounter({ streakCurrent }: { streakCurrent: number }) {
  const countStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  return (
    <View style={styles.streakCountContainer}>
      <LinearGradient
        colors={['#FF6B35', '#FFD700', '#FF9500']}
        style={styles.streakCountGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <HeartAnimation />
        <View style={styles.streakCountContent}>
          <Text style={styles.streakCountNum}>{streakCurrent}</Text>
          <Text style={styles.streakCountLabel}>Day Streak</Text>
          <Text style={styles.streakCountSublabel}>At risk of breaking ⚠️</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function SavedAnimation({ onDone, streakCurrent }: { onDone: () => void; streakCurrent: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 400 });
    textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    const timeout = setTimeout(() => {
      runOnJS(onDone)();
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textOpacity.value * 0 + (1 - textOpacity.value) * 20 }],
  }));

  return (
    <View style={styles.savedContainer}>
      <FloatingParticles count={14} type="petal" />

      <Animated.View style={shieldStyle}>
        <LinearGradient
          colors={[COLORS.amberLight, COLORS.golden, COLORS.earth]}
          style={styles.shieldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.shieldEmoji}>🛡️</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.savedText, textStyle]}>
        <Text style={styles.savedTitle}>Streak Saved! 🎉</Text>
        <Text style={styles.savedSubtitle}>
          Your {streakCurrent}-day streak lives on.{'\n'}Amazing dedication!
        </Text>
      </Animated.View>

      <View style={styles.savedMascotRow}>
        <Mascot size={90} mood="proud" animate />
        <View style={styles.savedBubble}>
          <Text style={styles.savedBubbleText}>
            You're unstoppable! Keep building that forest 🌳
          </Text>
        </View>
      </View>
    </View>
  );
}

export function StreakProtectionScreen({ navigation }: any) {
  const [stage, setStage] = useState<ProtectionStage>('warning');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [protectError, setProtectError] = useState<string | null>(null);
  const { success, warning } = useHaptics();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const protectStreakMutation = useProtectStreak();

  const freezeOptions = buildFreezeOptions(user?.streakFreezesAvailable ?? 0, user?.xp ?? 0);

  const handleContinue = useCallback(async () => {
    if (stage === 'warning') {
      setStage('choosing');
      return;
    }
    if (stage !== 'choosing' || !selectedOption) return;

    if (selectedOption === 'plant') {
      navigation.replace('PlantTree');
      return;
    }

    setProtectError(null);
    try {
      await protectStreakMutation.mutateAsync(selectedOption as 'freeze' | 'xp');
      success();
      setStage('saved');
    } catch (e) {
      setProtectError(e instanceof Error ? e.message : 'Could not protect your streak. Please try again.');
    }
  }, [stage, selectedOption, success, navigation, protectStreakMutation]);

  const handleDismiss = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={
          stage === 'saved'
            ? [COLORS.forest, COLORS.forestDeep, COLORS.nightForest]
            : ['#1A0A0A', '#3D1A00', '#5C2D00']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {stage === 'saved' ? (
        <>
          <SavedAnimation onDone={handleDismiss} streakCurrent={user?.streakCurrent ?? 0} />
          <View style={[styles.savedButton, { paddingBottom: insets.bottom + 24 }]}>
            <AnimatedButton
              label="Continue Growing 🌱"
              onPress={handleDismiss}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>

          {/* Mascot section */}
          <View style={styles.mascotSection}>
            <Mascot size={100} mood={stage === 'warning' ? 'calm' : 'encouraging'} animate />
          </View>

          {/* Message */}
          {stage === 'warning' && (
            <View style={styles.messageSection}>
              <Text style={styles.messageTitle}>
                Hey {user?.name ?? 'there'}, don't{'\n'}let your streak fade 🌿
              </Text>
              <Text style={styles.messageBody}>
                You've been building something beautiful for {user?.streakCurrent ?? 0} days.
                A few moments today keeps your forest alive — and your momentum going.
              </Text>
            </View>
          )}

          {stage === 'choosing' && (
            <View style={styles.messageSection}>
              <Text style={styles.messageTitle}>
                How would you like to{'\n'}protect your streak? 🛡️
              </Text>
              <Text style={styles.messageBody}>
                Choose the option that feels right for you today.
              </Text>
            </View>
          )}

          {/* Streak counter */}
          <StreakCounter streakCurrent={user?.streakCurrent ?? 0} />

          {/* Record */}
          <GlassCard variant="dark" style={styles.recordCard}>
            <Text style={styles.recordIcon}>🏆</Text>
            <View>
              <Text style={styles.recordTitle}>Your Personal Best</Text>
              <Text style={styles.recordValue}>{user?.streakMax ?? 0} days — you can beat it!</Text>
            </View>
          </GlassCard>

          {/* Options (choosing stage) */}
          {stage === 'choosing' && (
            <View style={styles.optionsSection}>
              {freezeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  disabled={option.disabled}
                  onPress={() => {
                    setSelectedOption(option.id);
                    warning();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[
                    styles.optionCard,
                    selectedOption === option.id && styles.optionCardSelected,
                    option.recommended && styles.optionCardRecommended,
                    option.disabled && styles.optionCardDisabled,
                  ]}>
                    {option.recommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>RECOMMENDED</Text>
                      </View>
                    )}
                    <View style={styles.optionLeft}>
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, selectedOption === option.id && styles.optionTitleSelected]}>
                        {option.title}
                      </Text>
                      <Text style={styles.optionSubtitle}>{option.subtitle}{option.disabled ? ' — unavailable' : ''}</Text>
                    </View>
                    <View style={[styles.optionCheck, selectedOption === option.id && styles.optionCheckSelected]}>
                      {selectedOption === option.id && <Text style={styles.optionCheckIcon}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {protectError && <Text style={styles.errorText}>{protectError}</Text>}

          {/* CTA */}
          <View style={styles.ctaSection}>
            <AnimatedButton
              label={
                stage === 'warning'
                  ? '🛡️  Save My Streak'
                  : protectStreakMutation.isPending
                    ? 'Protecting...'
                    : selectedOption
                      ? '✓  Confirm'
                      : 'Choose an option'
              }
              onPress={handleContinue}
              variant={stage === 'choosing' && !selectedOption ? 'secondary' : 'golden'}
              size="lg"
              fullWidth
              disabled={(stage === 'choosing' && !selectedOption) || protectStreakMutation.isPending}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismissButton: {
    padding: 8,
  },
  dismissText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  mascotSection: {
    alignItems: 'center',
  },
  messageSection: {
    alignItems: 'center',
    gap: 10,
  },
  messageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  messageBody: {
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 23,
  },
  streakCountContainer: {
    ...SHADOWS.golden,
  },
  streakCountGradient: {
    borderRadius: RADIUS.xxl,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heartEmoji: {
    fontSize: 48,
  },
  streakCountContent: {
    flex: 1,
  },
  streakCountNum: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 58,
    letterSpacing: -2,
  },
  streakCountLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  streakCountSublabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 2,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  recordIcon: {
    fontSize: 28,
  },
  recordTitle: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
  },
  recordValue: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '700',
    marginTop: 2,
  },
  optionsSection: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    overflow: 'hidden',
  },
  optionCardSelected: {
    borderColor: COLORS.golden,
    backgroundColor: 'rgba(212,168,83,0.15)',
  },
  optionCardRecommended: {
    borderColor: 'rgba(168,196,153,0.4)',
  },
  optionCardDisabled: {
    opacity: 0.4,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.coral,
    textAlign: 'center',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: COLORS.sage,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionLeft: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 26,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: COLORS.amberLight,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 17,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckSelected: {
    backgroundColor: COLORS.golden,
    borderColor: COLORS.golden,
  },
  optionCheckIcon: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  ctaSection: {},
  savedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 28,
  },
  shieldGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.golden,
  },
  shieldEmoji: {
    fontSize: 52,
  },
  savedText: {
    alignItems: 'center',
    gap: 8,
  },
  savedTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  savedSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  savedMascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  savedBubble: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: 190,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  savedBubbleText: {
    fontSize: 13,
    color: COLORS.white,
    lineHeight: 19,
    fontWeight: '500',
  },
  savedButton: {
    paddingHorizontal: 24,
  },
});
