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
import { useHaptics } from '../hooks/useHaptics';
import { useNurseryPublicProfile, useCreateReservation } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

export function SaplingReservationScreen({ navigation, route }: any) {
  const { nurseryId, stockId } = route.params as { nurseryId: string; stockId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: profile, isLoading } = useNurseryPublicProfile(nurseryId);
  const stock = profile?.stock.find((s) => s.id === stockId);
  const createMutation = useCreateReservation();

  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [requested, setRequested] = useState(false);

  const maxQuantity = stock?.quantity ?? 1;

  const adjustQuantity = (delta: number) => {
    setQuantity((q) => Math.min(maxQuantity, Math.max(1, q + delta)));
  };

  const handleRequest = async () => {
    if (!stock) return;
    setActionError('');
    try {
      await createMutation.mutateAsync({ nurseryId, stockId, quantity, message: message.trim() || undefined });
      success();
      setRequested(true);
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const soldOut = stock && stock.quantity < 1;

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
        <Text style={styles.headerTitle} numberOfLines={1}>Request Saplings</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !stock ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.title}>{stock.species}</Text>
            <Text style={styles.nurseryName}>from {profile?.nurseryName}</Text>
            <View style={styles.divider} />
            <Text style={styles.stockLine}>
              {stock.quantity} available · {stock.isFree ? 'Free' : stock.priceCents != null ? `₹${(stock.priceCents / 100).toFixed(0)} each` : 'Priced'}
            </Text>
          </GlassCard>

          {requested ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>🌱 Request sent! The nursery will review and get back to you.</Text>
            </View>
          ) : soldOut ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This species is currently out of stock.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>How many saplings?</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperButton} onPress={() => adjustQuantity(-1)} disabled={quantity <= 1}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{quantity}</Text>
                <TouchableOpacity style={styles.stepperButton} onPress={() => adjustQuantity(1)} disabled={quantity >= maxQuantity}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Message (optional)</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What are these saplings for?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                style={styles.input}
              />
              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
              <AnimatedButton
                label={createMutation.isPending ? 'Sending request…' : 'Request saplings'}
                onPress={handleRequest}
                disabled={createMutation.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.requestButton}
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
  nurseryName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  stockLine: { fontSize: 13, color: COLORS.textSecondary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginTop: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 },
  stepperButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { fontSize: 22, fontWeight: '700', color: COLORS.forest },
  stepperValue: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, minWidth: 48, textAlign: 'center' },
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
  requestButton: { marginTop: 4 },
  successBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 16 },
  successText: { fontSize: 14, color: COLORS.forest, fontWeight: '600', textAlign: 'center' },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
