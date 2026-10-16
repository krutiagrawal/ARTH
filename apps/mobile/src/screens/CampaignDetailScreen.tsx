import React, { Suspense, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Switch } from 'react-native';
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

import { TEXT } from '../constants/typography';
// Loaded only once a donation is actually in flight – see PaymentSheetRunner's own comment for
// why this keeps `@stripe/stripe-react-native` out of this screen's own module-scope imports.
const LazyPaymentSheetRunner = React.lazy(() => import('../components/payments/PaymentSheetRunner'));

const AMOUNT_CHIPS = [100, 500, 1500, 5000];
const MESSAGE_MAX = 300;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function CampaignDetailScreen({ navigation, route }: any) {
  // `presetAmount` (rupees) comes from the quick-donate chips on the campaigns list.
  const { campaignId, presetAmount } = route.params as { campaignId: string; presetAmount?: number };
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

  const [selectedAmount, setSelectedAmount] = useState<number | null>(presetAmount ?? 500);
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [donationError, setDonationError] = useState('');
  const [donated, setDonated] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [pan, setPan] = useState('');
  const [paidCents, setPaidCents] = useState(0);
  // Non-null only while a real payment sheet is in flight – mounts LazyPaymentSheetRunner below.
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);

  // Donations can't push the total past the NGO's goal: cap at what's still needed (whole rupees).
  const remainingCents = campaign?.goalAmountCents != null ? Math.max(0, campaign.goalAmountCents - campaign.raisedAmountCents) : null;
  const goalReached = remainingCents === 0;
  const capRupees = remainingCents != null ? Math.floor(remainingCents / 100) : null;
  const [capNotice, setCapNotice] = useState(false);

  // The preset (or default) amount may already be above what's left once the campaign loads.
  useEffect(() => {
    if (capRupees != null && selectedAmount != null && selectedAmount > capRupees) {
      setSelectedAmount(capRupees > 0 ? capRupees : null);
    }
  }, [capRupees, selectedAmount]);

  const amountRupees = customAmount ? Number(customAmount) : selectedAmount;
  const amountCents = amountRupees ? Math.round(amountRupees * 100) : 0;

  const handleDonate = async () => {
    if (!campaign || !amountCents || amountCents < 100) {
      setDonationError('Enter an amount of at least ₹1.');
      return;
    }
    if (pan && !PAN_REGEX.test(pan)) {
      setDonationError('Enter a valid PAN (e.g. ABCDE1234F) or leave it blank.');
      return;
    }
    setDonationError('');
    setPaying(true);
    try {
      const intent = await createIntent.mutateAsync({
        campaignId: campaign.id,
        amountCents,
        isAnonymous: anonymous,
        message: message.trim() || undefined,
        donorPan: pan || undefined,
      });
      setPaidCents(amountCents);

      // No Stripe key configured on the backend (local/dev only) – the donation already came
      // back succeeded, so there's no payment sheet to present. Skip straight to success.
      if (intent.clientSecret) {
        setActiveClientSecret(intent.clientSecret);
        return;
      }

      success();
      setDonated(true);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      // The Campaigns tab on an NGO's public profile embeds its own campaign snapshots inside
      // this separate query – never invalidated otherwise, so it kept showing the pre-donation total.
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
            {campaign.anonymousRaisedCents > 0 && (
              <Text style={styles.anonText}>🕶️ {formatRupees(campaign.anonymousRaisedCents)} of this was given anonymously</Text>
            )}
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
              <Text style={styles.successEmoji}>💚</Text>
              <Text style={styles.successTitle}>Thank you!</Text>
              <Text style={styles.successText}>
                Your {formatRupees(paidCents)} donation is on its way to {campaign.ngoName}.
                {user?.email ? ` A receipt will be emailed to ${user.email}.` : ''}
              </Text>
              <TouchableOpacity style={styles.successLink} onPress={() => navigation.navigate('MyDonations')} accessibilityRole="button">
                <Text style={styles.successLinkText}>View my donations</Text>
              </TouchableOpacity>
            </View>
          ) : goalReached ? (
            <View style={styles.successBanner}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>Goal reached</Text>
              <Text style={styles.successText}>Thank you to everyone who donated. This campaign isn't taking more donations.</Text>
            </View>
          ) : campaign.status === 'closed' ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This campaign is no longer accepting donations.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Choose an amount</Text>
              <View style={styles.chipRow}>
                {AMOUNT_CHIPS.filter((amt) => capRupees == null || amt <= capRupees).map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                      setCapNotice(false);
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
                  const digits = v.replace(/[^0-9]/g, '');
                  // Stop the keystroke that would go over what the campaign still needs.
                  if (capRupees != null && Number(digits) > capRupees) {
                    setCapNotice(true);
                    return;
                  }
                  setCapNotice(false);
                  setCustomAmount(digits);
                  setSelectedAmount(null);
                }}
                placeholder="eg - Or enter a custom amount (₹)"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                style={styles.input}
              />

              <BorderCard style={styles.detailsCard}>
                <Text style={styles.summaryLine}>
                  {amountCents ? `You're donating ${formatRupees(amountCents)} to ` : 'Choose an amount to donate to '}
                  <Text style={styles.summaryStrong}>{campaign.title}</Text> by {campaign.ngoName}
                </Text>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>Donate anonymously</Text>
                    <Text style={styles.toggleHint}>Your name won't be shown to other donors. {campaign.ngoName} can still see it.</Text>
                  </View>
                  <Switch
                    value={anonymous}
                    onValueChange={setAnonymous}
                    trackColor={{ false: COLORS.sand, true: COLORS.sage }}
                    thumbColor={COLORS.white}
                    accessibilityLabel="Donate anonymously"
                  />
                </View>

                <Text style={styles.fieldLabel}>Message to the NGO (optional)</Text>
                <TextInput
                  value={message}
                  onChangeText={(v: string) => setMessage(v.slice(0, MESSAGE_MAX))}
                  placeholder="Add a few words of encouragement"
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  style={[styles.input, styles.messageInput]}
                />
                <Text style={styles.counter}>{message.length}/{MESSAGE_MAX}</Text>

                <Text style={styles.fieldLabel}>PAN for your 80G receipt (optional)</Text>
                <TextInput
                  value={pan}
                  onChangeText={(v: string) => setPan(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.input, { marginBottom: 6 }]}
                />
                <Text style={styles.toggleHint}>
                  {user?.email ? `Your receipt will be emailed to ${user.email}.` : 'Your receipt will be emailed to you.'}
                </Text>
              </BorderCard>

              {capRupees != null && (
                <Text style={[styles.capHint, capNotice && styles.capHintActive]}>
                  {capNotice ? `Maximum is ${formatRupees(capRupees * 100)} – that's all this campaign still needs.` : `This campaign needs ${formatRupees(remainingCents!)} more. You can donate up to ${formatRupees(capRupees * 100)}.`}
                </Text>
              )}

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
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 20 },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  ngoName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary, marginBottom: 12 },
  capHint: { fontSize: 12, color: COLORS.textMuted, marginTop: -8, marginBottom: 14, paddingHorizontal: 4 },
  capHintActive: { color: COLORS.dangerDark, fontWeight: '600' },
  anonText: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
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
  successBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 20, alignItems: 'center' },
  successEmoji: { fontSize: 36 },
  successTitle: { ...TEXT.heading, color: COLORS.forest, marginTop: 4 },
  successText: { fontSize: 14, color: COLORS.forest, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  successLink: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  successLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  detailsCard: { marginTop: 4, marginBottom: 16 },
  summaryLine: { fontSize: 14, lineHeight: 20, color: COLORS.textPrimary, marginBottom: 14 },
  summaryStrong: { fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  toggleHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, lineHeight: 17 },
  messageInput: { height: 84, paddingTop: 12, borderRadius: RADIUS.md, textAlignVertical: 'top', marginBottom: 4 },
  counter: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginBottom: 14 },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
