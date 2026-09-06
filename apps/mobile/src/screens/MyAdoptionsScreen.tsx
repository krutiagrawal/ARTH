import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BlurCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useHaptics } from '../hooks/useHaptics';
import { useMyAdoptions, useReleaseMyAdoption } from '../hooks/useApiQueries';
import type { ApiAdoptableTree } from '../api/adoptions';

function AdoptionRow({ tree, navigation }: { tree: ApiAdoptableTree; navigation: any }) {
  const releaseMutation = useReleaseMyAdoption();
  const { success } = useHaptics();

  const handleRelease = () => {
    Alert.alert(
      `Release ${tree.nickname}?`,
      'This tree will go back into the adoptable pool for someone else to care for.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Release', style: 'destructive', onPress: async () => { await releaseMutation.mutateAsync(tree.id); success(); } },
      ],
    );
  };

  return (
    <TouchableOpacity onPress={() => navigation.navigate('AdoptTreeDetail', { treeId: tree.id })} activeOpacity={0.85}>
      <BlurCard tint="light" noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{tree.nickname}</Text>
          <Text style={styles.meta}>{tree.speciesName} · {tree.ngoName}</Text>
          {tree.adopter?.adoptedAt && (
            <Text style={styles.since}>Adopted since {new Date(tree.adopter.adoptedAt).toLocaleDateString()}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleRelease} disabled={releaseMutation.isPending} style={styles.releaseButton}>
          <Text style={styles.releaseText}>{releaseMutation.isPending ? '…' : 'Release'}</Text>
        </TouchableOpacity>
      </BlurCard>
    </TouchableOpacity>
  );
}

export function MyAdoptionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: trees, isLoading } = useMyAdoptions();

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
        <Text style={styles.headerTitle}>My Adopted Trees</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !trees || trees.length === 0 ? (
        <EmptyState icon="🌳" title="No adopted trees yet" body="Trees you adopt from NGOs will show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {trees.map((t) => (
            <AdoptionRow key={t.id} tree={t} navigation={navigation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  since: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  releaseButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(194,74,59,0.1)' },
  releaseText: { fontSize: 12, fontWeight: '700', color: COLORS.dangerDark },
});
