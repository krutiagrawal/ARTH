import React, { useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { IconBadge } from '../components/common/IconBadge';
import { EmptyState } from '../components/common/EmptyState';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { FormField } from '../components/common/FormField';
import { PhoneField } from '../components/common/PhoneField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { StatusModal } from '../components/common/StatusModal';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { ApiError, resolveMediaUrl } from '../api/client';
import type { ApiStaffMember } from '../api/staff';
import { useSlideUp } from '../hooks/useAnimations';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { isValidEmail, isValidPhone } from '../utils/validation';

import { TEXT } from '../constants/typography';
function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export function NgoStaffScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: staff = [], isLoading, refetch } = useStaff();
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();
  const confirm = useConfirm();
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRole('');
    setContactEmail('');
    setContactPhone('');
    setPhoto(null);
    setError(null);
    setShowForm(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (member: ApiStaffMember) => {
    setEditingId(member.id);
    setName(member.name);
    setRole(member.role);
    setContactEmail(member.contactEmail ?? '');
    setContactPhone(member.contactPhone ?? '');
    setPhoto(null);
    setError(null);
    setShowForm(true);
  };

  const editingMember = editingId ? staff.find((m) => m.id === editingId) : undefined;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !role.trim()) {
      setError('Name and role are required.');
      return;
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      setError('Enter a valid email address');
      return;
    }
    if (contactPhone && !isValidPhone(contactPhone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          name: name.trim(),
          role: role.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          photo: photo ?? undefined,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          role: role.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          photo: photo ?? undefined,
        });
      }
      resetForm();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Could not ${editingId ? 'save these changes' : 'add this staff member'}.`);
    }
  };

  const handleDelete = (id: string, staffName: string) => {
    confirm('Remove staff member', `Remove ${staffName} from your roster?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: guard(() => deleteMutation.mutate(id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Staff Roster"
        subtitle="Manage your team's public listing"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => (showForm ? resetForm() : guard(openAdd)())} style={styles.addButton}>
            <Text style={styles.addIcon}>{showForm ? '×' : '+'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Edit staff member' : 'Add staff member'}</Text>
            {editingId && editingMember?.photoUrl && !photo && (
              <View style={styles.currentPhotoRow}>
                <Image source={{ uri: resolveMediaUrl(editingMember.photoUrl) }} style={styles.currentPhoto} />
                <Text style={styles.currentPhotoText}>Current photo — pick a new one below to replace it</Text>
              </View>
            )}
            <PhotoPickerField
              photo={photo}
              onChange={setPhoto}
              mode="gallery"
              label="Add Photo"
              hint="A friendly headshot works best"
            />
            <FormField label="Name" value={name} onChangeText={setName} placeholder="eg - Full name" />
            <FormField label="Role" value={role} onChangeText={setRole} placeholder="eg - Field Coordinator" />
            <FormField
              label="Email"
              value={contactEmail}
              onChangeText={setContactEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="eg - name@example.org"
            />
            <PhoneField label="Phone" value={contactPhone} onChangeText={setContactPhone} />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={[styles.submitButton, isSaving && styles.submitButtonDisabled]} onPress={guard(handleSubmit)} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>{editingId ? 'Save changes' : 'Add to roster'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && staff.length === 0 && !showForm && (
          <EmptyState icon="🧑‍🤝‍🧑" title="No staff listed yet" body="Add your team so supporters know who's behind the work." actionLabel="Add staff" onAction={guard(openAdd)} />
        )}
        {staff.map((member, i) => (
          <FadeInRow key={member.id} delay={i * 60}>
            <BorderCard style={styles.card}>
              <View style={styles.cardRow}>
                {member.photoUrl ? (
                  <Image source={{ uri: resolveMediaUrl(member.photoUrl) }} style={styles.avatar} />
                ) : (
                  <IconBadge icon="🧑‍🤝‍🧑" color={COLORS.warmBrown} size={40} round />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{member.name}</Text>
                  <Text style={styles.cardRole}>{member.role}</Text>
                  {(member.contactEmail || member.contactPhone) && (
                    <Text style={styles.cardMeta}>{[member.contactEmail, member.contactPhone].filter(Boolean).join(' · ')}</Text>
                  )}
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity onPress={guard(() => openEdit(member))}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(member.id, member.name)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BorderCard>
          </FadeInRow>
        ))}
      </ScrollView>

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.beige },
  addIcon: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  loader: { marginTop: 40 },
  formCard: { marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  currentPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  currentPhoto: { width: 40, height: 40, borderRadius: 20 },
  currentPhotoText: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  cardRole: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  rowActions: { alignItems: 'flex-end', gap: 8 },
  editText: { fontSize: 12, color: COLORS.forest, fontWeight: '600' },
  removeText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
});
