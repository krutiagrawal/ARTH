import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { IconBadge } from '../components/common/IconBadge';
import { EmptyState } from '../components/common/EmptyState';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useStaff, useCreateStaff, useDeleteStaff } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useSlideUp } from '../hooks/useAnimations';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export function NgoStaffScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: staff = [], isLoading } = useStaff();
  const createMutation = useCreateStaff();
  const deleteMutation = useDeleteStaff();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRole('');
    setContactEmail('');
    setContactPhone('');
    setPhoto(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    setError(null);
    if (!name.trim() || !role.trim()) {
      setError('Name and role are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        role: role.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        photo: photo ?? undefined,
      });
      resetForm();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add this staff member.');
    }
  };

  const handleDelete = (id: string, staffName: string) => {
    Alert.alert('Remove staff member', `Remove ${staffName} from your roster?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
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
          <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={styles.addButton}>
            <Text style={styles.addIcon}>{showForm ? '×' : '+'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={styles.formCard}>
            <PhotoPickerField
              photo={photo}
              onChange={setPhoto}
              mode="gallery"
              label="Add Photo"
              hint="A friendly headshot works best"
            />
            <FormField label="Name" value={name} onChangeText={setName} placeholder="Full name" />
            <FormField label="Role" value={role} onChangeText={setRole} placeholder="Field Coordinator" />
            <FormField
              label="Email"
              value={contactEmail}
              onChangeText={setContactEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@example.org"
            />
            <FormField
              label="Phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholder="Optional"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]} onPress={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Add to roster</Text>}
            </TouchableOpacity>
          </View>
        )}

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && staff.length === 0 && !showForm && (
          <EmptyState icon="🧑‍🤝‍🧑" title="No staff listed yet" body="Add your team so supporters know who's behind the work." actionLabel="Add staff" onAction={() => setShowForm(true)} />
        )}
        {staff.map((member, i) => (
          <FadeInRow key={member.id} delay={i * 60}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                <IconBadge icon="🧑‍🤝‍🧑" color={COLORS.warmBrown} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{member.name}</Text>
                  <Text style={styles.cardRole}>{member.role}</Text>
                  {(member.contactEmail || member.contactPhone) && (
                    <Text style={styles.cardMeta}>{[member.contactEmail, member.contactPhone].filter(Boolean).join(' · ')}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(member.id, member.name)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </FadeInRow>
        ))}
      </ScrollView>
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
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardRole: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  removeText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
});
