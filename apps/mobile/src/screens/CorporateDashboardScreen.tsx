import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { SHADOWS } from '../constants/theme';
import { EcoWidget } from '../components/common/EcoWidget';
import { IconBadge } from '../components/common/IconBadge';
import { ThemedCard } from '../components/common/ThemedCard';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { useTimeTheme, type TimeTheme } from '../hooks/useTimeTheme';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import { useAuth } from '../context/AuthContext';
import { useCorporateProfile, useCorporateStats } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { getHeroSeamColor, getHeroSeamTextColors } from '../utils/heroSeam';
import type { CorporateTabName } from '../navigation/AppNavigator';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = SH * 0.5;

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: { title: 'Under review', body: "We're reviewing your company account. Sponsorships go public once approved." },
  rejected: { title: 'Application rejected', body: 'Update your details and resubmit from Settings.' },
  suspended: { title: 'Account suspended', body: 'Contact support for details.' },
};

function StatusBanner({ status }: { status: string }) {
  if (status === 'approved') return null;
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  return (
    <View style={styles.statusBanner}>
      <Text style={styles.statusTitle}>{copy.title}</Text>
      <Text style={styles.statusBody}>{copy.body}</Text>
    </View>
  );
}

function QuickAction({
  theme,
  delay,
  emoji,
  color,
  title,
  body,
  onPress,
}: {
  theme: TimeTheme;
  delay: number;
  emoji: string;
  color: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const animStyle = useSlideUp(delay, 18);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <ThemedCard theme={theme} style={styles.actionCard}>
          <View style={styles.actionRow}>
            <IconBadge icon={emoji} color={color} round />
            <View style={styles.actionTextColumn}>
              <Text style={[styles.actionTitle, { color: theme.textPrimaryOnCard }]}>{title}</Text>
              <Text style={[styles.actionBody, { color: theme.textSecondaryOnCard }]}>{body}</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.textSecondaryOnCard }]}>›</Text>
          </View>
        </ThemedCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CorporateDashboardScreenProps {
  navigation: any;
  onNavigateTab: (tab: CorporateTabName) => void;
}

export function CorporateDashboardScreen({ navigation, onNavigateTab }: CorporateDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user } = useAuth();
  const { data: profile } = useCorporateProfile();
  const { data: stats, isLoading } = useCorporateStats();

  const pageBackground = getHeroSeamColor(theme);
  const seamText = getHeroSeamTextColors(theme);

  const tileProps = {
    variant: 'glass' as const,
    fill: true,
    style: styles.gridTile,
    color: theme.accentColor,
    cardBackground: theme.cardBackground,
    cardBackgroundAlt: theme.cardBackgroundAlt,
    cardOverlayAlpha: theme.cardOverlayAlpha,
    textColor: theme.textPrimaryOnCard,
    subTextColor: theme.textSecondaryOnCard,
    borderColor: theme.cardBorder,
  };

  return (
    <View style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
      >
        <View style={[styles.heroSection, { height: HERO_HEIGHT }]}>
          {theme.heroImage ? (
            <Image
              source={theme.heroImage}
              style={{ position: 'absolute', top: 0, left: 0, width: SW, height: HERO_HEIGHT }}
              resizeMode="cover"
            />
          ) : (
            <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={12} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', pageBackground]}
            style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.24 }]}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[styles.greeting, { color: theme.textOnSky }]}>{theme.greeting} {theme.emoji}</Text>
              <Text style={[styles.orgName, { color: theme.textOnSky }]}>{profile?.companyName ?? user?.name ?? 'Your company'}</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={() => onNavigateTab('Settings')}>
              <LinearGradient colors={[COLORS.sageLight, COLORS.forest]} style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.avatarEmoji ?? '🏢'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <EcoWidget
              icon="🤝"
              value={stats?.sponsorshipCount ?? 0}
              label="Sponsorships"
              variant="glass"
              dark
              color={theme.accentColor}
              cardBackground={theme.cardBackground}
              cardBackgroundAlt={theme.cardBackgroundAlt}
              cardOverlayAlpha={theme.cardOverlayAlpha}
              textColor={theme.textSecondaryOnCard}
              subTextColor={theme.textSecondaryOnCard}
              borderColor={theme.cardBorder}
              delay={100}
              onPress={() => navigation.navigate('CorporateSponsorships')}
            />
            <EcoWidget
              icon="💰"
              value={`₹${((stats?.totalSponsoredCents ?? 0) / 100).toLocaleString()}`}
              label="Sponsored"
              variant="glass"
              dark
              color={theme.accentColor}
              cardBackground={theme.cardBackground}
              cardBackgroundAlt={theme.cardBackgroundAlt}
              cardOverlayAlpha={theme.cardOverlayAlpha}
              textColor={theme.textSecondaryOnCard}
              subTextColor={theme.textSecondaryOnCard}
              borderColor={theme.cardBorder}
              delay={200}
              onPress={() => navigation.navigate('CorporateSponsorships')}
            />
          </View>
        </View>

        {profile && <StatusBanner status={profile.status} />}

        {isLoading || !stats ? (
          <ActivityIndicator color={theme.accentColor} style={styles.loader} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Your Impact</Text>
            <View style={styles.gridRow}>
              <EcoWidget {...tileProps} icon="🤝" value={String(stats.sponsorshipCount)} label="Sponsorships" delay={0} />
              <EcoWidget {...tileProps} icon="💰" value={`₹${(stats.totalSponsoredCents / 100).toLocaleString()}`} label="Total CSR spend" delay={60} />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Quick Actions</Text>

        <QuickAction
          theme={theme}
          delay={120}
          emoji="🤝"
          color={COLORS.golden}
          title="Sponsor a drive"
          body="Back a planting drive as part of your CSR spend."
          onPress={() => navigation.navigate('CorporateSponsorships')}
        />
        <QuickAction
          theme={theme}
          delay={160}
          emoji="⚙️"
          color={COLORS.earth}
          title="Company profile"
          body="Logo, description, industry, and city."
          onPress={() => onNavigateTab('Settings')}
        />
      </ScrollView>

      <View style={styles.ambientLayer} pointerEvents="none">
        <AmbientCreatures period={theme.period} fireflyAreaHeight={SH * 0.5} />
        {sceneryMode === 'rain' && <RainEffect count={24} />}
        {sceneryMode === 'wind' && <WindEffect count={6} />}
        {sceneryMode === 'leaves' && (
          <FloatingParticles
            count={5}
            type={theme.particleType === 'firefly' ? 'leaf' : theme.particleType}
            speedMultiplier={2.2}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientLayer: { ...StyleSheet.absoluteFillObject },
  scrollContent: { paddingHorizontal: 16, gap: 8 },
  heroSection: { position: 'relative', overflow: 'hidden', marginHorizontal: -16 },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  orgName: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  avatarButton: {},
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sage },
  avatarText: { fontSize: 22 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  loader: { marginTop: 20, marginBottom: 8 },
  statusBanner: { backgroundColor: 'rgba(232,184,75,0.18)', borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  statusBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },
  sectionTitle: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 27, marginTop: 20 },
  actionCard: { marginBottom: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionTextColumn: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionBody: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '600' },
});
