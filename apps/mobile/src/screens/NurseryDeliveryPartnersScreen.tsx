import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Linking } from 'react-native';
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
import { PhoneField } from '../components/common/PhoneField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { StatusModal } from '../components/common/StatusModal';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useDeliveryPartners,
  useDeliveryPartnersSummary,
  useCreateDeliveryPartner,
  useUpdateDeliveryPartner,
  useDeactivateDeliveryPartner,
  useNurseryProfile,
} from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { ApiError } from '../api/client';
import type { ApiDeliveryPartner } from '../api/deliveryPartners';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useEmailField } from '../hooks/useEmailField';
import { usePhoneField } from '../hooks/usePhoneField';
import { isValidPhone } from '../utils/validation';

type PartnerFilter = 'all' | 'available' | 'busy' | 'inactive';
const FILTERS: { key: PartnerFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'busy', label: 'On delivery' },
  { key: 'inactive', label: 'Deactivated' },
];

function PartnerRow({
  partner,
  onToggle,
  onEdit,
  onOpen,
  onTrack,
}: {
  partner: ApiDeliveryPartner;
  onToggle: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onTrack: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onOpen}>
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
          <View style={styles.contactRow}>
            {partner.activeOrderCount > 0 && (
              <TouchableOpacity onPress={onTrack} style={[styles.contactChip, styles.trackChip]}>
                <Text style={[styles.contactChipText, { color: COLORS.white }]}>📍 Track live</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${partner.phone}`).catch(() => {})} style={styles.contactChip}>
              <Text style={styles.contactChipText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/91${partner.phone}`).catch(() => {})} style={styles.contactChip}>
              <Text style={styles.contactChipText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggle} style={[styles.toggleButton, !partner.isActive && styles.toggleButtonInactive]}>
            <Text style={[styles.toggleButtonText, !partner.isActive && styles.toggleButtonTextInactive]}>
              {partner.isActive ? 'Deactivate' : 'Reactivate'}
            </Text>
          </TouchableOpacity>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function NurseryDeliveryPartnersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  // Search and status filter run on the server (debounced), so they cover every rider and the
  // list only ever loads one page at a time.
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PartnerFilter>('all');
  const debouncedQuery = useDebouncedValue(query);
  const listQuery = useDeliveryPartners({
    q: debouncedQuery.trim() || undefined,
    status: filter === 'all' ? undefined : filter === 'busy' ? 'busy' : filter === 'available' ? 'available' : 'inactive',
  });
  const { data: partners = [], isLoading, refetch: refetchList } = listQuery;
  const { data: summary, refetch: refetchSummary } = useDeliveryPartnersSummary();
  const refetch = () => Promise.all([refetchList(), refetchSummary()]);
  const createMutation = useCreateDeliveryPartner();
  const updateMutation = useUpdateDeliveryPartner();
  const deactivateMutation = useDeactivateDeliveryPartner();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const { data: profile } = useNurseryProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'nursery', profile?.rejectionReason);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const email = useEmailField();
  const phone = usePhoneField('', true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Editing an existing partner's name/phone – separate from the create form above, since it
  // pre-fills from a partner that's already registered (running the create form's "is this phone
  // already taken" check against its own current number would always false-flag it as taken).
  const [editingPartner, setEditingPartner] = useState<ApiDeliveryPartner | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = (partner: ApiDeliveryPartner) => {
    setEditingPartner(partner);
    setEditName(partner.name);
    setEditPhone(partner.phone);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPartner) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Enter a name');
      return;
    }
    if (!isValidPhone(editPhone)) {
      setEditError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: editingPartner.id, name: editName.trim(), phone: editPhone });
      setEditingPartner(null);
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : 'Could not save these changes. Please try again.');
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !handle.trim() || !email.value.trim() || !phone.value || password.length < 8) {
      setError('Fill in every field – the temp password needs at least 8 characters.');
      return;
    }
    if (!email.valid) {
      email.setTouched(true);
      setError('Enter a valid email address');
      return;
    }
    if (email.taken) {
      setError('This email is already registered');
      return;
    }
    if (!phone.valid) {
      phone.setTouched(true);
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (phone.taken) {
      setError('This phone number is already registered');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        email: email.value.trim().toLowerCase(),
        phone: phone.value,
        password,
      });
      setName('');
      setHandle('');
      email.setValue('');
      phone.setValue('');
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
        { text: 'Deactivate', style: 'destructive', onPress: guard(() => deactivateMutation.mutate(partner.id)) },
      ]);
    } else {
      guard(() => updateMutation.mutate({ id: partner.id, isActive: true }))();
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('NurseryLiveMap')} style={styles.newButton}>
              <Text style={styles.newButtonText}>🗺️ Live map</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={guard(() => setShowCreate(true))} style={styles.newButton}>
              <Text style={styles.newButtonText}>+ New</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {isLoading && !summary ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : summary && summary.total === 0 ? (
        <EmptyState
          icon="🛵"
          title="No delivery partners yet"
          body="Add a rider so you can assign deliveries to them and let customers track their sapling live."
          actionLabel="Add a delivery partner"
          onAction={guard(() => setShowCreate(true))}
        />
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) listQuery.fetchNextPage();
          }}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
          ListHeaderComponent={
            <View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{summary?.total ?? '–'}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{summary?.available ?? '–'}</Text>
                  <Text style={styles.summaryLabel}>Available</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{summary?.busy ?? '–'}</Text>
                  <Text style={styles.summaryLabel}>On delivery</Text>
                </View>
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or phone"
                placeholderTextColor={COLORS.textMuted}
                style={styles.search}
                autoCorrect={false}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={isLoading ? null : <Text style={styles.noMatch}>No delivery partners match.</Text>}
          ListFooterComponent={<PageFooter loading={listQuery.isFetchingNextPage} />}
          renderItem={({ item: p }) => (
            <PartnerRow
              partner={p}
              onToggle={() => handleToggle(p)}
              onEdit={guard(() => openEdit(p))}
              onOpen={() => navigation.navigate('NurseryDeliveryPartnerDetail', { partnerId: p.id })}
              onTrack={() => navigation.navigate('NurseryLiveMap', { focusPartnerId: p.id })}
            />
          )}
        />
      )}

      <Sheet visible={showCreate} onClose={() => setShowCreate(false)} title="Add a delivery partner" scrollable maxHeight={620}>
        <View style={{ gap: 4 }}>
          <FormField maxLength={80} required label="Name" value={name} onChangeText={setName} placeholder="eg - Rider's full name" />
          <FormField maxLength={30} required label="Handle" value={handle} onChangeText={setHandle} placeholder="eg - ravi_delivers" autoCapitalize="none" />
          <FormField
            required label="Email"
            value={email.value}
            onChangeText={email.setValue}
            onBlur={() => email.setTouched(true)}
            placeholder="eg - rider@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {email.error ? (
            <Text style={[styles.errorText, { textAlign: 'left' }]}>{email.error}</Text>
          ) : email.checking ? (
            <Text style={styles.hint}>Checking…</Text>
          ) : null}
          <PhoneField
            required label="Phone"
            value={phone.value}
            onChangeText={phone.setValue}
            onBlur={() => phone.setTouched(true)}
            error={phone.touched ? phone.error : phone.checking ? 'Checking…' : null}
          />
          <FormField required label="Temporary password" value={password} onChangeText={setPassword} placeholder="eg - At least 8 characters" secureTextEntry />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Text style={styles.hint}>
            Share this password with your delivery partner directly – they can log in on their own phone with this email and password.
          </Text>
          <AnimatedButton
            label={createMutation.isPending ? 'Adding…' : 'Add delivery partner'}
            onPress={guard(handleCreate)}
            disabled={createMutation.isPending}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Sheet>

      <Sheet visible={!!editingPartner} onClose={() => setEditingPartner(null)} title="Edit delivery partner" scrollable>
        <View style={{ gap: 4 }}>
          <FormField maxLength={80} required label="Name" value={editName} onChangeText={setEditName} placeholder="eg - Rider's full name" />
          <PhoneField required label="Phone" value={editPhone} onChangeText={setEditPhone} />
          {/* Sign-in details can't be changed here, but showing them keeps the form complete. */}
          <FormField label="Handle (can't be changed)" value={editingPartner?.handle ?? ''} editable={false} />
          <FormField label="Email (can't be changed)" value={editingPartner?.email ?? ''} editable={false} />
          {editError && <Text style={styles.errorText}>{editError}</Text>}
          <AnimatedButton
            label={updateMutation.isPending ? 'Saving…' : 'Save changes'}
            onPress={guard(handleSaveEdit)}
            disabled={updateMutation.isPending}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </Sheet>

      <StatusModal {...statusModalProps} />
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
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { borderWidth: 1.5, borderColor: COLORS.forest, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 },
  editButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.forest },
  toggleButton: { borderWidth: 1.5, borderColor: COLORS.dangerDark, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 },
  toggleButtonInactive: { borderColor: COLORS.forest },
  toggleButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.dangerDark },
  toggleButtonTextInactive: { color: COLORS.forest },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  contactChip: { borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.earth, paddingHorizontal: 10, paddingVertical: 4 },
  trackChip: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  contactChipText: { fontSize: 11, fontWeight: '700', color: COLORS.earthDark },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryTile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.forest },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary },
  search: {
    borderWidth: 1.5, borderColor: COLORS.warmBrown, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, marginBottom: 10,
  },
  filterScroll: { marginBottom: 12, flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.warmBrown, marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  noMatch: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginVertical: 20 },
  errorText: { fontSize: 13, color: COLORS.coral, textAlign: 'center', marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginTop: 4 },
});
