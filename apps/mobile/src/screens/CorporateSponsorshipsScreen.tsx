import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useSponsorships, useCreateSponsorship, useDeleteSponsorship, useCorporateProfile } from '../hooks/useApiQueries';
import type { ApiCsrSponsorship } from '../api/corporate';
import { ApiError } from '../api/client';

function SponsorshipRow({ item, onDelete }: { item: ApiCsrSponsorship; onDelete: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.amount}>₹{(item.amountCents / 100).toLocaleString()}</Text>
        <Text style={styles.meta}>{item.drive?.title ?? item.note ?? 'General sponsorship'}</Text>
      </View>
      <TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel="Remove sponsorship">
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CorporateSponsorshipsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useCorporateProfile();
  const { data: sponsorships = [], isLoading } = useSponsorships();
  const createMutation = useCreateSponsorship();
  const deleteMutation = useDeleteSponsorship();

  const [amount, setAmount] = useState('');
  const [driveId, setDriveId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isApproved = profile?.status === 'approved';

  const handleAdd = async () => {
    setError(null);
    const cents = Number(amount) * 100;
    if (!Number.isFinite(cents) || cents <= 0) {
      setError('Enter a valid sponsorship amount.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        amountCents: Math.round(cents),
        driveId: driveId.trim() || undefined,
        note: note.trim() || undefined,
      });
      setAmount('');
      setDriveId('');
      setNote('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this sponsorship. Please try again.');
    }
  };

  const handleDelete = (item: ApiCsrSponsorship) => {
    Alert.alert('Remove sponsorship?', 'This record will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="CSR Sponsorships"
        subtitle="Track your company's sponsored drives"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {!isApproved && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>Your account is not yet approved — sponsorships can't be added until then.</Text>
        </View>
      )}

      {isApproved && (
        <View style={styles.addCard}>
          <FormField label="Amount (₹)" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="number-pad" />
          <FormField label="Drive ID (optional)" value={driveId} onChangeText={setDriveId} placeholder="Leave blank for a general sponsorship" />
          <FormField label="Note (optional)" value={note} onChangeText={setNote} placeholder="What is this sponsoring?" />
          {error && <Text style={styles.error}>{error}</Text>}
          <AnimatedButton
            label={createMutation.isPending ? 'Adding…' : '+ Add sponsorship'}
            onPress={handleAdd}
            disabled={createMutation.isPending}
            fullWidth
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.addButton}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sponsorships}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          renderItem={({ item }) => <SponsorshipRow item={item} onDelete={() => handleDelete(item)} />}
          ListEmptyComponent={
            <EmptyState icon="🤝" title="No sponsorships yet" body="Add your first sponsorship above." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warning: { marginHorizontal: 20, marginBottom: 4, backgroundColor: 'rgba(232,184,75,0.18)', borderRadius: 14, padding: 12 },
  warningText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  addCard: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  addButton: { marginTop: 8 },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 4 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  rowText: { flex: 1 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  deleteIcon: { fontSize: 18 },
});
