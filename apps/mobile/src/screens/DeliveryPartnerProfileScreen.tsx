import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useMyPartnerProfile } from '../hooks/useApiQueries';
import { useAuth } from '../context/AuthContext';

export function DeliveryPartnerProfileScreen({ navigation }: any) {
  const bottomNavClearance = useBottomNavClearance();
  const { data: profile, isLoading } = useMyPartnerProfile();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation?.reset?.({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="My Profile" />

      {isLoading || !profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <View style={[styles.content, { paddingBottom: bottomNavClearance }]}>
          <BorderCard style={styles.card}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>@{profile.handle}</Text>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Nursery</Text>
              <Text style={styles.value}>{profile.nurseryName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile.phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Rating</Text>
              <Text style={styles.value}>{profile.avgRating != null ? `★ ${Number(profile.avgRating).toFixed(1)} (${profile.reviewCount})` : 'No ratings yet'}</Text>
            </View>
            {!profile.isActive && <Text style={styles.inactiveNote}>Your account has been deactivated by your nursery.</Text>}
          </BorderCard>

          <AnimatedButton label="Log out" onPress={handleLogout} variant="secondary" size="lg" fullWidth style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  card: { marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  handle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: 13, color: COLORS.textSecondary },
  value: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  inactiveNote: { fontSize: 12, color: COLORS.dangerDark, fontWeight: '600', marginTop: 10, textAlign: 'center' },
});
