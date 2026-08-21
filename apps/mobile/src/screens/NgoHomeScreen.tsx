import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { useAuth } from '../context/AuthContext';

export function NgoHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>NGO Dashboard</Text>
        <Text style={styles.title}>{user?.name ?? 'Welcome'}</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoDrives')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>🤝</Text>
            <Text style={styles.cardTitle}>Planting drives</Text>
            <Text style={styles.cardBody}>Publish new drives and manage RSVPs.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoTrees')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>🌳</Text>
            <Text style={styles.cardTitle}>Adoptable trees</Text>
            <Text style={styles.cardBody}>List trees for the community to adopt.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoCampaigns')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>💚</Text>
            <Text style={styles.cardTitle}>Donation campaigns</Text>
            <Text style={styles.cardBody}>Raise funds for your next drive.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoPostUpdate')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>📸</Text>
            <Text style={styles.cardTitle}>Post an update</Text>
            <Text style={styles.cardBody}>Share a real-time photo with your followers.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoHealthCheck')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>🩺</Text>
            <Text style={styles.cardTitle}>Survival & impact</Text>
            <Text style={styles.cardBody}>Log planted trees and track their health over time.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoVolunteers')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>👥</Text>
            <Text style={styles.cardTitle}>Volunteers</Text>
            <Text style={styles.cardBody}>See who's shown up for your drives.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoStaff')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>🧑‍🤝‍🧑</Text>
            <Text style={styles.cardTitle}>Staff roster</Text>
            <Text style={styles.cardBody}>Manage your team's public listing.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoDonations')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>💸</Text>
            <Text style={styles.cardTitle}>Donations</Text>
            <Text style={styles.cardBody}>View and filter incoming donations.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoReports')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>📊</Text>
            <Text style={styles.cardTitle}>Reports</Text>
            <Text style={styles.cardBody}>Stats and trends across your drives.</Text>
          </GlassCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoSettings')}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={styles.cardTitle}>NGO profile & settings</Text>
            <Text style={styles.cardBody}>Logo, description, city, awards, and more.</Text>
          </GlassCard>
        </TouchableOpacity>

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
  eyebrow: { fontSize: 12, fontWeight: '700', color: COLORS.sage, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4, marginBottom: 20 },
  card: { marginBottom: 14 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  signOutButton: { alignSelf: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.full },
  signOutText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});
