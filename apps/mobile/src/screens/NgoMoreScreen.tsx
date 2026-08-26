import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { IconBadge } from '../components/common/IconBadge';
import { LeafBranch } from '../components/common/LeafBranch';
import { useAuth } from '../context/AuthContext';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';

interface MenuItem {
  emoji: string;
  title: string;
  body: string;
  route: string;
  color: string;
}

const ITEMS: MenuItem[] = [
  { emoji: '📚', title: 'Past Work', body: 'Drives you ran before joining PLANT', route: 'NgoPortfolio', color: COLORS.coral },
  { emoji: '👥', title: 'Volunteers', body: "See who's shown up for your drives", route: 'NgoVolunteers', color: COLORS.xpBlue },
  { emoji: '🧑‍🤝‍🧑', title: 'Staff Roster', body: "Manage your team's public listing", route: 'NgoStaff', color: COLORS.warmBrown },
  { emoji: '💸', title: 'Donations', body: 'View and filter incoming donations', route: 'NgoDonations', color: COLORS.golden },
  { emoji: '📊', title: 'Reports', body: 'Stats and trends across your drives', route: 'NgoReports', color: COLORS.sage },
  // Map lost its tab slot to Community; it lives here now.
  { emoji: '🗺️', title: 'Map', body: 'Drives and planted trees near you', route: 'Map', color: COLORS.skyDay },
  { emoji: '🔔', title: 'Notifications', body: 'Follows, likes and requests', route: 'Notifications', color: COLORS.amber },
  { emoji: '🚫', title: 'Blocked Accounts', body: 'People and orgs you have hidden', route: 'BlockedAccounts', color: COLORS.textMuted },
  { emoji: '⚙️', title: 'NGO Profile & Settings', body: 'Logo, description, follow policy & more', route: 'NgoSettings', color: COLORS.earth },
];

function MenuRow({ delay, item, onPress }: { delay: number; item: MenuItem; onPress: () => void }) {
  const animStyle = useSlideUp(delay, 18);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <GlassCard variant="warm" style={styles.card} borderRadius={22} noPadding>
          <View style={styles.cardRow}>
            <IconBadge icon={item.emoji} color={item.color} size={52} round />
            <View style={styles.cardTextColumn}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function NgoMoreScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      <LeafBranch size={150} style={[styles.leaf, { top: insets.top + 8 }]} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Access all features and settings</Text>

        {ITEMS.map((item, i) => (
          <MenuRow key={item.route} delay={i * 60} item={item} onPress={() => navigation.navigate(item.route)} />
        ))}

        <TouchableOpacity style={styles.signOutButton} onPress={() => logout()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  leaf: { right: -18 },
  title: { fontFamily: FONTS.displayBold, fontSize: 32, lineHeight: 42, color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 22 },

  // Taller than the old rows and borderless (the `warm` variant no longer draws one), so each
  // card reads as a soft frosted panel the way the reference's menu does.
  card: { marginBottom: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 16 },
  cardTextColumn: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  chevron: { fontSize: 24, color: COLORS.textMuted, fontWeight: '400' },

  signOutButton: { alignSelf: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.full },
  signOutText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});
