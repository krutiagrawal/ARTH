import React, { Suspense, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useHaptics } from '../hooks/useHaptics';
import { useCampaign, useCreateDonationIntent, useNgoDonations, useNgoProfile } from '../hooks/useApiQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// Loaded only once a donation is actually in flight — see PaymentSheetRunner's own comment for
// why this keeps `@stripe/stripe-react-native` out of this screen's own module-scope imports.
const LazyPaymentSheetRunner = React.lazy(() => import('../components/payments/PaymentSheetRunner'));

const AMOUNT_CHIPS = [100, 500, 1500, 5000];

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function CampaignDetailScreen({ navigation, route }: any) {
  const { campaignId } = route.params as { campaignId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: campaign, isLoading, refetch } = useCampaign(campaignId);
  const { user } = useAuth();
  const ngoProfile = useNgoProfile(user?.role === 'ngo');
  const isOwnCampaign = user?.role === 'ngo' && !!campaign && ngoProfile.data?.id === campaign.ngoId;
  const donationsQuery = useNgoDonations({ campaignId }, isOwnCampaign);
  const createIntent = useCreateDonationIntent();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [donationError, setDonationError] = useState('');
  const [donated, setDonated] = useState(false);
  // Non-null only while a real payment sheet is in flight — mounts LazyPaymentSheetRunner below.
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);

  const amountRupees = customAmount ? Number(customAmount) : selectedAmount;
  const amountCents = amountRupees ? Math.round(amountRupees * 100) : 0;

  const handleDonate = async () => {
    if (!campaign || !amountCents || amountCents < 100) {
      setDonationError('Enter an amount of at least ₹1.');
      return;
    }
    setDonationError('');
    setPaying(true);
    try {
      const intent = await createIntent.mutateAsync({ campaignId: campaign.id, amountCents });

      // No Stripe key configured on the backend (local/dev only) — the donation already came
      // back succeeded, so there's no payment sheet to present. Skip straight to success.
      if (intent.clientSecret) {
        setActiveClientSecret(intent.clientSecret);
        return;
      }

      success();
      setDonated(true);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      // The Campaigns tab on an NGO's public profile embeds its own campaign snapshots inside
      // this separate query — never invalidated otherwise, so it kept showing the pre-donation total.
      queryClient.invalidateQueries({ queryKey: ['ngos', 'public'] });
      setPaying(false);
    } catch (e) {
      errorHaptic();
      if (e instanceof ApiError && e.code === 'SERVICE_UNAVAILABLE') {
        setDonationError('Donations aren’t live yet – please check back soon.');
      } else {
        setDonationError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
      setPaying(false);
    }
  };

  const handlePaymentSuccess = () => {
    success();
    setDonated(true);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['ngos', 'public'] });
    setActiveClientSecret(null);
    setPaying(false);
  };

  const handlePaymentCancel = () => {
    setActiveClientSecret(null);
    setPaying(false);
  };

  const handlePaymentError = (message: string) => {
    errorHaptic();
    setDonationError(message);
    setActiveClientSecret(null);
    setPaying(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !campaign ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <BorderCard style={styles.card}>
            <Text style={styles.title}>{campaign.title}</Text>
            <Text style={styles.ngoName}>{campaign.ngoName}</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>{campaign.description}</Text>
            <Text style={styles.raisedText}>
              {formatRupees(campaign.raisedAmountCents)}
              {campaign.goalAmountCents ? ` raised of ${formatRupees(campaign.goalAmountCents)}` : ' raised so far'}
            </Text>
          </BorderCard>

          {isOwnCampaign ? (
            <>
              <Text style={styles.fieldLabel}>Donors</Text>
              {donationsQuery.isLoading ? (
                <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 12 }} />
              ) : (donationsQuery.data?.donations.length ?? 0) === 0 ? (
                <Text style={styles.description}>No donations yet.</Text>
              ) : (
                donationsQuery.data!.donations.map((d) => (
                  <View key={d.id} style={styles.donorRow}>
                    <Text style={styles.donorName}>{d.donor.name}</Text>
                    <Text style={styles.donorAmount}>{formatRupees(d.amountCents)}</Text>
                  </View>
                ))
              )}
            </>
          ) : donated ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>💚 Thank you! Your donation is on its way to {campaign.ngoName}.</Text>
            </View>
          ) : campaign.status === 'closed' ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This campaign is no longer accepting donations.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Choose an amount</Text>
              <View style={styles.chipRow}>
                {AMOUNT_CHIPS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                    style={[styles.chip, selectedAmount === amt && !customAmount && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selectedAmount === amt && !customAmount && styles.chipTextSelected]}>
                      ₹{amt.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={customAmount}
                onChangeText={(v: string) => {
                  setCustomAmount(v.replace(/[^0-9]/g, ''));
                  setSelectedAmount(null);
                }}
                placeholder="eg - Or enter a custom amount (₹)"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                style={styles.input}
              />

              {donationError ? <Text style={styles.errorText}>{donationError}</Text> : null}

              <AnimatedButton
                label={paying ? 'Processing…' : `Donate ${amountCents ? formatRupees(amountCents) : ''}`}
                onPress={handleDonate}
                disabled={paying || !amountCents}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.donateButton}
              />
            </>
          )}
        </ScrollView>
      )}

      {activeClientSecret && (
        <Suspense fallback={null}>
          <LazyPaymentSheetRunner
            clientSecret={activeClientSecret}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            onError={handlePaymentError}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  ngoName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary, marginBottom: 12 },
  raisedText: { fontSize: 14, color: COLORS.forest, fontWeight: '700' },
  donorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(94,133,80,0.12)' },
  donorName: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  donorAmount: { fontSize: 14, color: COLORS.forest, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    backgroundColor: COLORS.mintLight,
  },
  chipSelected: { backgroundColor: COLORS.sage },
  chipText: { fontSize: 14, fontWeight: '600', color: COLORS.forest },
  chipTextSelected: { color: COLORS.white },
  input: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  donateButton: { marginTop: 4 },
  successBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 16 },
  successText: { fontSize: 14, color: COLORS.forest, fontWeight: '600', textAlign: 'center' },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
