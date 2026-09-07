import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

// Full-screen, no back button, sign-out only — reached via useBlockedRedirect()
// in AppNavigator the moment any request comes back ACCOUNT_BLOCKED. Distinct
// from the "BlockedAccounts" screen/route (that's the unrelated user-to-user
// mute feature reachable from Settings).
export function AccountBlockedScreen() {
  const insets = useSafeAreaInsets();
  const { logout, blockReason } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.dangerDark, '#1a1a1a']} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🚫</Text>
        </View>
        <Text style={styles.title}>ARTH has blocked your account</Text>
        <Text style={styles.body}>Contact support to unblock.</Text>
        {blockReason ? <Text style={styles.reason}>&ldquo;{blockReason}&rdquo;</Text> : null}

        <TouchableOpacity style={styles.signOutButton} onPress={() => logout()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 32 },
  title: { fontFamily: FONTS.displayBold, fontSize: 22, color: '#fff', textAlign: 'center', lineHeight: 30 },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 10, textAlign: 'center' },
  reason: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
  signOutButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signOutText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
