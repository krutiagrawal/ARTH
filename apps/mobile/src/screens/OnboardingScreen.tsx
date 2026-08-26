import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { MascotInteraction } from '../components/common/MascotInteraction';
import { MuteButton } from '../components/common/MuteButton';
import { ONBOARDING_PAGES } from '../data/dummyData';
import { useFadeIn, useFloat } from '../hooks/useAnimations';

const { width: SW, height: SH } = Dimensions.get('window');

const PAGE_GRADIENTS = [
  [COLORS.forestDeep, COLORS.forest, COLORS.sageLight],
  [COLORS.earthDark, COLORS.warmBrown, COLORS.golden],
  [COLORS.nightSky, '#2C5282', COLORS.skyDay],
  [COLORS.nightForest, COLORS.forestDeep, COLORS.earth],
];

const PAGE_ILLUSTRATIONS = ['🌱', '🔥', '🌍', '👥'];

function OnboardingPage({
  page,
  index,
  scrollX,
}: {
  page: typeof ONBOARDING_PAGES[0];
  index: number;
  scrollX: SharedValue<number>;
}) {
  const floatStyle = useFloat(8, 2500);

  const inputRange = [(index - 1) * SW, index * SW, (index + 1) * SW];

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP),
      },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollX.value, inputRange, [30, 0, 30], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={[styles.page, { width: SW }]}>
      <LinearGradient
        colors={PAGE_GRADIENTS[index] as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <FloatingParticles
        count={8}
        type={index === 1 ? 'petal' : index === 3 ? 'firefly' : 'leaf'}
      />

      {/* Text content */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.pageTitle}>{page.title}</Text>
        <Text style={styles.pageSubtitle}>{page.subtitle}</Text>
      </Animated.View>

      {/* Illustration circle */}
      <Animated.View style={[styles.illustrationContainer, containerStyle]}>
        <View style={[styles.illustrationOuter, { borderColor: `${page.accent}40` }]}>
          <View style={[styles.illustrationInner, { backgroundColor: `${page.accent}20` }]}>
            <Animated.Text style={[styles.illustrationEmoji, floatStyle]}>
              {PAGE_ILLUSTRATIONS[index]}
            </Animated.Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function DotIndicator({
  count,
  scrollX,
}: {
  count: number;
  scrollX: SharedValue<number>;
}) {
  return (
    <View style={dotStyles.container}>
      {Array.from({ length: count }).map((_, i) => {
        const dotStyle = useAnimatedStyle(() => {
          const input = scrollX.value / SW;
          const width = interpolate(
            input,
            [i - 0.5, i, i + 0.5],
            [8, 24, 8],
            Extrapolation.CLAMP
          );
          const opacity = interpolate(
            input,
            [i - 0.5, i, i + 0.5],
            [0.4, 1, 0.4],
            Extrapolation.CLAMP
          );
          return { width, opacity };
        });

        return (
          <Animated.View key={i} style={[dotStyles.dot, dotStyle]} />
        );
      })}
    </View>
  );
}

export function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SW);
    setCurrentIndex(index);
  }, []);

  const finishOnboarding = useCallback(() => {
    AsyncStorage.setItem('plant_onboarded', 'true');
    navigation.replace('AccountType');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(prev => prev + 1);
    } else {
      finishOnboarding();
    }
  }, [currentIndex, finishOnboarding]);

  const handleSkip = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  const isLastPage = currentIndex === ONBOARDING_PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.FlatList
        ref={flatListRef as any}
        data={ONBOARDING_PAGES}
        keyExtractor={item => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <OnboardingPage page={item} index={index} scrollX={scrollX} />
        )}
      />

      {/* Ollie + Roots guided interaction overlay */}
      <MascotInteraction pageIndex={currentIndex} visible />

      {/* Bottom controls */}
      <View style={styles.controls}>
        <DotIndicator count={ONBOARDING_PAGES.length} scrollX={scrollX} />

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>{isLastPage ? '' : 'Skip'}</Text>
          </TouchableOpacity>

          <AnimatedButton
            label={isLastPage ? '🌱  Start Growing' : ONBOARDING_PAGES[currentIndex].cta}
            onPress={handleNext}
            variant="primary"
            size="lg"
            style={isLastPage ? styles.ctaButtonLarge : styles.ctaButton}
            gradientColors={[PAGE_GRADIENTS[currentIndex][0], PAGE_GRADIENTS[currentIndex][1]]}
          />

          <View style={styles.skipButton} />
        </View>
      </View>

      {/* Mute button */}
      <MuteButton style={styles.muteBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.forestDeep,
  },
  page: {
    height: SH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  illustrationOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: {
    fontSize: 82,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: SW * 0.82,
    marginBottom: 48,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 25,
    fontWeight: '400',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 44,
    paddingHorizontal: 28,
    gap: 20,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipButton: {
    width: 60,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '500',
  },
  ctaButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  ctaButtonLarge: {
    flex: 1,
    marginHorizontal: 0,
  },
  muteBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});

const dotStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
