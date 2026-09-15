import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useDeliveryPartners,
  useCreateDeliveryPartner,
  useUpdateDeliveryPartner,
  useDeactivateDeliveryPartner,
} from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiDeliveryPartner } from '../api/deliveryPartners';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function PartnerRow({ partner, onToggle }: { partner: ApiDeliveryPartner; onToggle: () => void }) {
  return (
    <BorderCard style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{partner.name}</Text>
        <Text style={styles.phone}>{partner.phone}</Text>
        <View style={styles.metaRow}>
          <View style={styles.queueBadge}>
            <Text style={styles.queueBadgeText}>{partner.activeOrderCount} active</Text>
          </View>
          {partner.avgRating != null && <Text style={styles.rating}>★ {Number(partner.avgRating).toFixed(1)}</Text>}
          {!partner.isActive && <Text style={styles.inactiveTag}>Deactivated</Text>}
        </View>
      </View>
      <TouchableOpacity onPress={onToggle} style={[styles.toggleButton, !partner.isActive && styles.toggleButtonInactive]}>
        <Text style={[styles.toggleButtonText, !partner.isActive && styles.toggleButtonTextInactive]}>
          {partner.isActive ? 'Deactivate' : 'Reactivate'}
        </Text>
      </TouchableOpacity>
    </BorderCard>
  );
}

export function NurseryDeliveryPartnersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: partners = [], isLoading, refetch } = useDeliveryPartners();
  const createMutation = useCreateDeliveryPartner();
  const updateMutation = useUpdateDeliveryPartner();
  const deactivateMutation = useDeactivateDeliveryPartner();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !handle.trim() || !email.trim() || !phone.trim() || password.length < 8) {
      setError('Fill in every field — the temp password needs at least 8 characters.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      setName('');
      setHandle('');
      setEmail('');
      setPhone('');
      setPassword('');
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this delivery partner. Please try again.');
    }
  };

  const handleToggle = (partner: ApiDeliveryPartner) => {
    if (partner.isActive) {
      confirm('Deactivate this delivery partner?', 'They will no longer be assignable to new orders, but any delivery already in progress keeps working.', [
        { text: 'Back', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMutation.mutate(partner.id) },
      ]);
    } else {
      updateMutation.mutate({ id: partner.id, isActive: true });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Delivery Partners"
        subtitle="Riders who deliver your orders"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
        right={
          <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.newButton}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : partners.length === 0 ? (
        <EmptyState
          icon="🛵"
          title="No delivery partners yet"
          body="Add a rider so you can assign deliveries to them and let customers track their sapling live."
          actionLabel="Add a delivery partner"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {partners.map((p) => (
            <PartnerRow key={p.id} partner={p} onToggle={() => handleToggle(p)} />
          ))}
        </ScrollView>
      )}

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Add a delivery partner" scrollable maxHeight={620}>
        <View style={{ gap: 4 }}>
          <FormField dark={isNightMode} label="Name" value={name} onChangeText={setName} placeholder="eg - Rider's full name" />
          <FormField dark={isNightMode} label="Handle" value={handle} onChangeText={setHandle} placeholder="eg - ravi_delivers" autoCapitalize="none" />
          <FormField dark={isNightMode} label="Email" value={email} onChangeText={setEmail} placeholder="eg - rider@example.com" keyboardType="email-address" autoCapitalize="none" />
          <FormField dark={isNightMode} label="Phone" value={phone} onChangeText={setPhone} placeholder="eg - Contact number" keyboardType="phone-pad" />
          <FormField dark={isNightMode} label="Temporary password" value={password} onChangeText={setPassword} placeholder="eg - At least 8 characters" secureTextEntry />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Text style={[styles.hint, isNightMode && styles.hintDark]}>
            Share this password with your delivery partner directly — they can log in on their own phone with this email and password.
          </Text>
          <AnimatedButton
            label={createMutation.isPending ? 'Adding…' : 'Add delivery partner'}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  newButton: { paddingHorizontal: 10, paddingVertical: 8 },
  newButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },
  list: { paddingHorizontal: SPACING.md, paddingTop: 8 },
  row: { marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  queueBadge: { backgroundColor: 'rgba(94,133,80,0.1)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  queueBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.forest },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.earth },
  inactiveTag: { fontSize: 11, fontWeight: '700', color: COLORS.dangerDark },
  toggleButton: { borderWidth: 1.5, borderColor: COLORS.dangerDark, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 },
  toggleButtonInactive: { borderColor: COLORS.forest },
  toggleButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.dangerDark },
  toggleButtonTextInactive: { color: COLORS.forest },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginTop: 4 },
  hintDark: { color: 'rgba(255,255,255,0.6)' },
});
