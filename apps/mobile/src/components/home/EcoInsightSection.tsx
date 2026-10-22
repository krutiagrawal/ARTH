import React, { type RefObject } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../common/AppText';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { TEXT } from '../../constants/typography';
import { useSlideUp } from '../../hooks/useAnimations';
import { isNightlikePeriod, type TimeTheme } from '../../hooks/useTimeTheme';
import { useEcoFacts } from '../../hooks/useApiQueries';
import { hexToRgba } from '../../utils/color';

function textColor(theme: TimeTheme, base: string) {
  return isNightlikePeriod(theme.period) ? ON_DARK_SURFACE.primary : base;
}

/** Today's eco fact with a "Learn more" link to the full Eco Insights screen - shared by the
 * individual, NGO and nursery home screens so every account type gets the same learning entry. */
export function EcoInsightSection({ navigation, blurTarget, theme }: { navigation: any; blurTarget: RefObject<View | null>; theme: TimeTheme }) {
  const slideStyle = useSlideUp(300, 24);
  const { data: ecoFacts = [] } = useEcoFacts();
  const fact = ecoFacts.length > 0 ? ecoFacts[new Date().getDate() % ecoFacts.length] : '';
  if (!fact) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor(theme, theme.textPrimaryOnCard) }]}>Eco Insight</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EcoInsights')}>
          <Text style={[styles.link, { color: textColor(theme, theme.accentColor) }]}>Learn more →</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={slideStyle}>
        <BlurView
          intensity={35}
          tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
          blurTarget={blurTarget}
          style={[styles.card, { borderColor: theme.cardBorder, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }]}
        >
          <LinearGradient
            colors={[hexToRgba(theme.cardBackground, theme.cardOverlayAlpha), hexToRgba(theme.cardBackgroundAlt, theme.cardOverlayAlpha)]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.8 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={[styles.tag, { color: textColor(theme, theme.accentColor) }]}>🌍 ECO INSIGHT</Text>
          <Text style={[styles.text, { color: textColor(theme, theme.textPrimaryOnCard) }]}>{fact}</Text>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  title: { ...TEXT.heading, color: COLORS.white },
  link: { fontSize: 13, color: COLORS.sageLight, fontWeight: '600' },
  card: { borderRadius: RADIUS.xl, padding: 20, overflow: 'hidden', ...SHADOWS.md, marginTop: 10, marginBottom: 8 },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  text: { fontSize: 16, color: COLORS.white, lineHeight: 24, fontWeight: '500' },
});
