import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useBrowseNgos } from '../hooks/useApiQueries';

export function NgoDirectoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data, isLoading } = useBrowseNgos({ q: query || undefined });
  const ngos = data?.ngos ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGOs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FollowingFeed')} style={styles.feedButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.feedIcon}>📰</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search NGOs by name or city"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && ngos.length === 0 && (
          <EmptyState icon="🌍" title="No NGOs found" body="Try a different search term." />
        )}
        {ngos.map((ngo) => (
          <TouchableOpacity key={ngo.id} onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: ngo.id })} activeOpacity={0.85}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                {ngo.logoUrl ? (
                  <Image source={{ uri: ngo.logoUrl }} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder}><Text style={{ fontSize: 20 }}>🌿</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{ngo.orgName}</Text>
                  {ngo.city ? <Text style={styles.cardMeta}>📍 {ngo.city}</Text> : null}
                  <Text style={styles.cardBody} numberOfLines={2}>{ngo.description}</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  backButton: { width: 40, height: 40 },
  feedButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  feedIcon: { fontSize: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sand, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 12 },
  logoPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
