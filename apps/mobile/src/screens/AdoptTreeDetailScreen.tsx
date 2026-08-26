import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { LocationActions } from '../components/common/LocationActions';
import { useHaptics } from '../hooks/useHaptics';
import { useAdoptableTree, useAdoptTree } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

export function AdoptTreeDetailScreen({ navigation, route }: any) {
  const { treeId } = route.params as { treeId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: tree, isLoading } = useAdoptableTree(treeId);
  const adoptMutation = useAdoptTree();
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [adopted, setAdopted] = useState(false);

  const handleAdopt = async () => {
    if (!tree) return;
    setActionError('');
    try {
      await adoptMutation.mutateAsync({ id: tree.id, message: message.trim() || undefined });
      success();
      setAdopted(true);
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const alreadyTaken = tree?.isAdopted && !adopted;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Tree Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !tree ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.title}>{tree.nickname}</Text>
            <Text style={styles.ngoName}>{tree.speciesName} · listed by {tree.ngoName}</Text>

            <View style={styles.divider} />

            <Text style={styles.description}>{tree.description}</Text>
          </GlassCard>

          <LocationActions label="Location" address={[tree.location, tree.city].filter(Boolean).join(', ')} />

          {tree.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsLabel}>What adopting this tree involves</Text>
              <Text style={styles.instructionsText}>{tree.instructions}</Text>
            </View>
          )}

          {adopted ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>🌳 You've adopted {tree.nickname}! Thank you for caring for it.</Text>
            </View>
          ) : alreadyTaken ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This tree has already been adopted by someone else.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Message (optional)</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Why does this tree matter to you?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                style={styles.input}
              />
              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
              <AnimatedButton
                label={adoptMutation.isPending ? 'Adopting…' : 'Adopt this tree'}
                onPress={handleAdopt}
                disabled={adoptMutation.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.adoptButton}
              />
            </>
          )}
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
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  ngoName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  instructionsCard: { backgroundColor: 'rgba(212,168,83,0.12)', borderRadius: RADIUS.lg, padding: 14, marginBottom: 16 },
  instructionsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  instructionsText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.2)',
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  adoptButton: { marginTop: 4 },
  successBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 16 },
  successText: { fontSize: 14, color: COLORS.forest, fontWeight: '600', textAlign: 'center' },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
