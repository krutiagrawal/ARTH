import React from 'react';
import { View, Image, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { MascotBubble } from '../components/common/Mascot';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAdminOverview } from '../hooks/useApiQueries';
import { useAuth } from '../context/AuthContext';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = SH * 0.4;
/** Admin's non-hero chrome deliberately stays a fixed dark "control panel" tone regardless of
 * time of day (unlike NGO/User, whose page background follows the theme) — only the hero
 * illustration itself retints through the day. Matches this fixed color so the hero fades
 * seamlessly into the page instead of into a color that shifts under it. */
export const PANEL_BG = '#0D2318';

function statusColor(status: string) {
  switch (status) {
    case 'approved':
      return COLORS.sageLight;
    case 'pending':
      return COLORS.amberLight;
    case 'rejected':
    case 'suspended':
      return COLORS.dangerLight;
    default:
      return ON_DARK_SURFACE.primary;
  }
}

export function AdminHomeScreen({ navigation, onNavigateTab }: any) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user, logout } = useAuth();
  const { data: overview, isLoading } = useAdminOverview();
  const statsAnim = useSlideUp(80, 20);

  const goTab = (tab: string) => (onNavigateTab ? onNavigateTab(tab) : navigation?.navigate?.(tab));
  const pendingCount = overview?.ngosByStatus?.pending ?? 0;
  const mascotMessage =
    pendingCount > 0
      ? `🔍 ${pendingCount} NGO application${pendingCount === 1 ? '' : 's'} awaiting review`
      : "All caught up — no NGOs waiting on you 🎉";

  return (
    <View style={styles.container}>
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
            <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={14} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', PANEL_BG]}
            style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.3 }]}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Text style={[styles.eyebrow, { color: theme.textOnSky }]}>Admin Console</Text>
            <Text style={[styles.title, { color: theme.textOnSky }]}>{user?.name ?? 'Welcome'}</Text>
          </View>
        </View>

        <View style={styles.mascotSection}>
          <MascotBubble message={mascotMessage} size={96} mood="calm" />
        </View>

        {isLoading || !overview ? (
          <ActivityIndicator color={COLORS.mint} style={styles.loader} />
        ) : (
          <Animated.View style={statsAnim}>
            <GlassCard variant="dark" style={styles.card}>
              <Text style={styles.cardTitle}>Users</Text>
              <View style={styles.statsGrid}>
                {Object.entries(overview.usersByRole).map(([role, count]) => (
                  <StatDisplay
                    key={role}
                    value={String(count)}
                    label={role}
                    color={ON_DARK_SURFACE.primary}
                    labelColor={ON_DARK_SURFACE.secondary}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard variant="dark" style={styles.card}>
              <Text style={styles.cardTitle}>NGO applications</Text>
              <View style={styles.statsGrid}>
                {Object.entries(overview.ngosByStatus).map(([status, count]) => (
                  <StatDisplay
                    key={status}
                    value={String(count)}
                    label={status}
                    color={statusColor(status)}
                    labelColor={ON_DARK_SURFACE.secondary}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard variant="dark" style={styles.card}>
              <Text style={styles.cardTitle}>Platform activity</Text>
              <View style={styles.statsGrid}>
                <StatDisplay
                  value={String(overview.drivesCount)}
                  label="Drives"
                  color={ON_DARK_SURFACE.primary}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
                <StatDisplay
                  value={String(overview.adoptedTreesCount)}
                  label="Trees adopted"
                  color={ON_DARK_SURFACE.primary}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
                <StatDisplay
                  value={`₹${(overview.totalDonatedCents / 100).toLocaleString()}`}
                  label="Total donated"
                  color={ON_DARK_SURFACE.primary}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
              </View>
            </GlassCard>

            <GlassCard variant="dark" style={styles.card}>
              <Text style={styles.cardTitle}>Trust &amp; safety</Text>
              <View style={styles.statsGrid}>
                <StatDisplay
                  value={String(overview.blockedUsersCount ?? 0)}
                  label="Blocked"
                  color={COLORS.dangerLight}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
                <StatDisplay
                  value={String(overview.openReportsCount ?? 0)}
                  label="Open reports"
                  color={ON_DARK_SURFACE.primary}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
                <StatDisplay
                  value={String(overview.treesPendingReviewCount ?? 0)}
                  label="Trees to review"
                  color={ON_DARK_SURFACE.primary}
                  labelColor={ON_DARK_SURFACE.secondary}
                />
              </View>
            </GlassCard>

            <TouchableOpacity activeOpacity={0.85} onPress={() => goTab('NGOs')}>
              <GlassCard variant="dark" style={styles.linkCard}>
                <Text style={styles.linkEmoji}>🏢</Text>
                <View style={styles.linkTextWrap}>
                  <Text style={styles.linkTitle}>NGO approvals</Text>
                  <Text style={styles.linkBody}>Review, approve, reject, or suspend NGO applications.</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation?.navigate?.('AdminAccountSearch')}>
              <GlassCard variant="dark" style={styles.linkCard}>
                <Text style={styles.linkEmoji}>🔎</Text>
                <View style={styles.linkTextWrap}>
                  <Text style={styles.linkTitle}>Accounts</Text>
                  <Text style={styles.linkBody}>Search and block/unblock any user, NGO, nursery, or corporate.</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => goTab('AuditLog')}>
              <GlassCard variant="dark" style={styles.linkCard}>
                <Text style={styles.linkEmoji}>📜</Text>
                <View style={styles.linkTextWrap}>
                  <Text style={styles.linkTitle}>Audit log</Text>
                  <Text style={styles.linkBody}>See every admin action taken on the platform.</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => goTab('More')}>
              <GlassCard variant="dark" style={styles.linkCard}>
                <Text style={styles.linkEmoji}>⚙️</Text>
                <View style={styles.linkTextWrap}>
                  <Text style={styles.linkTitle}>More</Text>
                  <Text style={styles.linkBody}>Nurseries, corporates, operations, tree verification, catalog.</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={() => logout()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.ambientLayer} pointerEvents="none">
        <AmbientCreatures period={theme.period} fireflyAreaHeight={HERO_HEIGHT} />
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
  container: { flex: 1, backgroundColor: PANEL_BG },
  ambientLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollContent: { paddingHorizontal: 16, gap: 8 },
  heroSection: { position: 'relative', overflow: 'hidden', marginHorizontal: -16 },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  eyebrow: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  mascotSection: { paddingLeft: 8, marginBottom: 4 },
  loader: { marginTop: 40 },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: ON_DARK_SURFACE.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  linkEmoji: { fontSize: 26 },
  linkTextWrap: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  linkBody: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 2 },
  signOutButton: { alignSelf: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.full },
  signOutText: { fontSize: 14, color: ON_DARK_SURFACE.secondary, fontWeight: '600' },
});
