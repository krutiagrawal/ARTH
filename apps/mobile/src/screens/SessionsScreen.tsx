import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { IconBadge } from '../components/common/IconBadge';
import { useSessions, useRevokeSession } from '../hooks/useApiQueries';
import type { ApiSession } from '../api/users';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SessionRow({ session }: { session: ApiSession }) {
  const revokeMutation = useRevokeSession();

  const handleRevoke = () => {
    Alert.alert(
      'Revoke this session?',
      'The device signed in on this session will be signed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(session.id) },
      ]
    );
  };

  return (
    <View style={styles.row}>
      <IconBadge icon="📱" color={COLORS.xpBlue} size={40} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{session.deviceInfo ?? 'Unknown device'}</Text>
        <Text style={styles.rowSublabel}>Signed in {formatDate(session.createdAt)}</Text>
      </View>
      <TouchableOpacity onPress={handleRevoke} disabled={revokeMutation.isPending} style={styles.revokeButton}>
        {revokeMutation.isPending ? (
          <ActivityIndicator size="small" color={COLORS.coral} />
        ) : (
          <Text style={styles.revokeText}>Revoke</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function SessionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: sessions = [], isLoading } = useSessions();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connected Devices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.sage} style={{ marginTop: 40 }} />
        ) : sessions.length === 0 ? (
          <Text style={styles.emptyText}>No active sessions found.</Text>
        ) : (
          <GlassCard variant="warm" noPadding style={styles.list}>
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40 },
  backBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 16 },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  rowSublabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(232,137,106,0.15)',
  },
  revokeText: { fontSize: 12, fontWeight: '700', color: COLORS.coral },
  emptyText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 40,
  },
});
