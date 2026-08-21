import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { useStaff, useCreateStaff, useDeleteStaff } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

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

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Roster</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} style={styles.addButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.addIcon}>{showForm ? '×' : '+'}</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Photo</Text>
            <PhotoPickerField photo={photo} onChange={setPhoto} mode="gallery" />
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>Role</Text>
            <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="Field Coordinator" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor="rgba(255,255,255,0.4)" />
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
        {staff.map((member) => (
          <GlassCard key={member.id} variant="warm" style={styles.card}>
            <View style={styles.cardRow}>
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  addButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  addIcon: { fontSize: 20, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  formCard: { backgroundColor: 'rgba(13,35,24,0.45)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18, gap: 6, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4 },
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
