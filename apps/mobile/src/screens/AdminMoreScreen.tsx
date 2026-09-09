import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { IconBadge } from '../components/common/IconBadge';
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

// Secondary admin sections that don't fit on the 4-slot bottom tab bar
// (Overview/NGOs/Reports/AuditLog) — same "More hub" pattern as NgoMoreScreen.
const ITEMS: MenuItem[] = [
  { emoji: '🔎', title: 'Accounts', body: 'Search and block/unblock any user, NGO, nursery, or corporate', route: 'AdminAccountSearch', color: COLORS.coral },
  { emoji: '🌱', title: 'Nursery Approvals', body: 'Review pending nursery applications', route: 'AdminNurseryApprovals', color: COLORS.sage },
  { emoji: '🏬', title: 'Corporate Approvals', body: 'Review pending corporate applications', route: 'AdminCorporateApprovals', color: COLORS.warmBrown },
  { emoji: '📦', title: 'Operations', body: 'Cancel drives, refund donations and orders', route: 'AdminOps', color: COLORS.xpBlue },
  { emoji: '🌳', title: 'Tree Verification', body: 'Review AI-flagged tree photo submissions', route: 'AdminTreeReview', color: COLORS.golden },
  { emoji: '📚', title: 'Catalog', body: 'Species, achievements, challenges, missions, themes, decorations', route: 'AdminCatalog', color: COLORS.skyDay },
];

function MenuRow({ delay, item, onPress }: { delay: number; item: MenuItem; onPress: () => void }) {
  const animStyle = useSlideUp(delay, 18);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <BorderCard style={styles.card} noPadding>
          <View style={styles.cardRow}>
            <IconBadge icon={item.emoji} color={item.color} size={52} round />
            <View style={styles.cardTextColumn}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </BorderCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AdminMoreScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Everything else admin can do</Text>

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
  title: { fontSize: 32, fontWeight: '800', color: ON_DARK_SURFACE.primary },
  subtitle: { fontSize: 13, color: ON_DARK_SURFACE.secondary, marginTop: 4, marginBottom: 22 },
  card: { marginBottom: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 16 },
  cardTextColumn: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  cardBody: { fontSize: 13, color: ON_DARK_SURFACE.secondary, marginTop: 3 },
  chevron: { fontSize: 24, color: ON_DARK_SURFACE.muted, fontWeight: '400' },
  signOutButton: { alignSelf: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.full },
  signOutText: { fontSize: 14, color: ON_DARK_SURFACE.secondary, fontWeight: '600' },
});
