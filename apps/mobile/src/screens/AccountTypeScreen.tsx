import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { useSlideUp } from '../hooks/useAnimations';

interface AccountTypeOption {
  route: string;
  emoji: string;
  accent: string;
  title: string;
  body: string;
}

const ACCOUNT_TYPES: AccountTypeOption[] = [
  { route: 'Register', emoji: '🌱', accent: COLORS.sage, title: 'Individual', body: 'Plant trees, build streaks, and grow your own forest.' },
  { route: 'GroupRegister', emoji: '👥', accent: COLORS.golden, title: 'Group', body: 'Family, school, or club — plant together and track shared progress.' },
  { route: 'NgoRegister', emoji: '🤝', accent: COLORS.forest, title: 'NGO', body: 'Host drives, run campaigns, and share your impact.' },
  { route: 'NurseryRegister', emoji: '🌿', accent: COLORS.earth, title: 'Nursery', body: 'List sapling stock and connect with planters near you.' },
  { route: 'CorporateRegister', emoji: '🏢', accent: COLORS.sageDark, title: 'Corporate', body: 'Sponsor drives and track your company’s CSR impact.' },
];

function AccountTypeCard({
  option,
  delay,
  onPress,
}: {
  option: AccountTypeOption;
  delay: number;
  onPress: () => void;
}) {
  const animStyle = useSlideUp(delay, 24);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
        <View style={[styles.illustrationOuter, { borderColor: `${option.accent}55` }]}>
          <View style={[styles.illustrationInner, { backgroundColor: `${option.accent}25` }]}>
            <Text style={styles.illustrationEmoji}>{option.emoji}</Text>
          </View>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{option.title}</Text>
          <Text style={styles.cardBody}>{option.body}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * The single hub both first-run onboarding (OnboardingScreen) and returning-user sign-up
 * (LoginScreen's "Sign up" link) funnel into — replaces the old flat text-link chooser at
 * the bottom of Login/Register screens now that there are 5 account types instead of 3.
 */
export function AccountTypeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <FloatingParticles count={8} type="leaf" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What best describes you?</Text>
        <Text style={styles.subtitle}>Pick an account type to get started — you can always reach out to switch later.</Text>

        <View style={styles.cardList}>
          {ACCOUNT_TYPES.map((option, i) => (
            <AccountTypeCard
              key={option.route}
              option={option}
              delay={i * 60}
              onPress={() => navigation.replace(option.route)}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  cardList: { gap: 14, marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
  },
  illustrationOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  cardBody: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 17 },
  chevron: { fontSize: 24, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  switchText: {
    fontSize: 13,
    color: COLORS.white,
    textAlign: 'center',
  },
  switchLink: {
    color: COLORS.mint,
    fontWeight: '700',
  },
});
