import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useBrowseNgos } from '../hooks/useApiQueries';
import { resolveMediaUrl } from '../api/client';

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
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGOs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FollowingFeed')} style={styles.feedButton}>
          <View style={styles.backBlur}>
            <Text style={styles.feedIcon}>📰</Text>
          </View>
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
        {ngos.length > 0 && (
          <BorderCard noPadding style={styles.groupedCard}>
            {ngos.map((ngo, i) => (
              <React.Fragment key={ngo.id}>
                {i > 0 && <View style={styles.rowDivider} />}
                <TouchableOpacity onPress={() => navigation.navigate('NgoPublicProfile', { ngoId: ngo.id })} activeOpacity={0.85} style={styles.row}>
                  <View style={styles.cardRow}>
                    {ngo.logoUrl ? (
                      <Image source={{ uri: resolveMediaUrl(ngo.logoUrl) }} style={styles.logo} />
                    ) : (
                      <View style={styles.logoPlaceholder}><Text style={{ fontSize: 20 }}>🌿</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{ngo.orgName}</Text>
                      {ngo.city ? <Text style={styles.cardMeta}>📍 {ngo.city}</Text> : null}
                      <Text style={styles.cardBody} numberOfLines={2}>{ngo.description}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </BorderCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  backButton: { width: 40, height: 40 },
  feedButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  feedIcon: { fontSize: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: { backgroundColor: 'transparent', borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  groupedCard: { marginBottom: 12 },
  row: { padding: 14 },
  rowDivider: { height: 1, backgroundColor: 'rgba(160,114,74,0.25)', marginHorizontal: 14 },
  cardRow: { flexDirection: 'row', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 12 },
  logoPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
