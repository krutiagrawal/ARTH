import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { COLORS, GRADIENTS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { MuteButton } from '../components/common/MuteButton';
import { useAuth } from '../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');

const HERO_ASPECT = 1536 / 1024;
const HERO_W = SW * 0.72;
const HERO_H = HERO_W * HERO_ASPECT;

const ONBOARDED_KEY = 'plant_onboarded';

export function SplashScreen({ navigation }: any) {
  const imageScale = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(20);
  const glowOpacity = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const authStateRef = useRef({ authLoading, isAuthenticated });
  authStateRef.current = { authLoading, isAuthenticated };

  const navigateNext = async () => {
    // Wait for the auth check to settle (usually already done by the time the intro finishes).
    while (authStateRef.current.authLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (authStateRef.current.isAuthenticated) {
      navigation.replace('Main');
      return;
    }

    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
    navigation.replace(onboarded === 'true' ? 'Login' : 'Onboarding');
  };

  useEffect(() => {
    // Sequence: glow → hero image grows → heading appears → navigate
    glowOpacity.value = withTiming(1, { duration: 800 });

    imageOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    imageScale.value = withDelay(
      400,
      withSpring(1, { damping: 12, stiffness: 80 })
    );

    logoOpacity.value = withDelay(1100, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    logoY.value = withDelay(1100, withSpring(0, { damping: 14, stiffness: 100 }));

    particleOpacity.value = withDelay(800, withTiming(1, { duration: 1000 }));

    // Navigate after 5.5s
    const timeout = setTimeout(() => {
      bgOpacity.value = withTiming(0, { duration: 500 }, () => {
        runOnJS(navigateNext)();
      });
    }, 5500);

    return () => clearTimeout(timeout);
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Ambient glow */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <Canvas style={{ width: SW, height: SH }}>
          <Circle cx={SW / 2} cy={SH * 0.45} r={180}>
            <RadialGradient
              c={vec(SW / 2, SH * 0.45)}
              r={180}
              colors={['rgba(168, 196, 153, 0.35)', 'rgba(168, 196, 153, 0)']}
            />
          </Circle>
          <Circle cx={SW / 2} cy={SH * 0.45} r={120}>
            <RadialGradient
              c={vec(SW / 2, SH * 0.45)}
              r={120}
              colors={['rgba(212, 168, 83, 0.2)', 'rgba(212, 168, 83, 0)']}
            />
          </Circle>
        </Canvas>
      </Animated.View>

      {/* Floating particles */}
      <FloatingParticles count={12} type="dust" />

      {/* Heading + tagline, above the hero image */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Text style={styles.logoText}>PLANT</Text>
        <Text style={styles.tagline}>grow your world</Text>
      </Animated.View>

      {/* Hero image */}
      <Animated.View style={[styles.heroContainer, imageStyle]}>
        <Image
          source={require('../../assets/opening_image.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Ground gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(13, 35, 24, 0.8)']}
        style={styles.groundGradient}
      />

      {/* Mute button */}
      <MuteButton style={styles.muteBtn} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    width: HERO_W,
    height: HERO_H,
  },
  heroImage: {
    width: HERO_W,
    height: HERO_H,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  groundGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  muteBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});
