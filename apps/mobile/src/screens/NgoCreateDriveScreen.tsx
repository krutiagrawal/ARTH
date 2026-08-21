import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useCreateDrive } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

interface PickupPointDraft {
  address: string;
  arrivalBy: Date;
}

interface PlantDraft {
  speciesName: string;
  priceRupees: string;
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={styles.inputText}>{value.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
        />
      )}
    </>
  );
}

export function NgoCreateDriveScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createDriveMutation = useCreateDrive();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [transportMode, setTransportMode] = useState<'self_arrange' | 'ngo_provided'>('self_arrange');
  const [pickupPoints, setPickupPoints] = useState<PickupPointDraft[]>([]);
  const [plants, setPlants] = useState<PlantDraft[]>([]);
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [durationMinutes, setDurationMinutes] = useState('');
  const [capacity, setCapacity] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const addPickupPoint = () => setPickupPoints((prev) => [...prev, { address: '', arrivalBy: new Date(startsAt) }]);
  const removePickupPoint = (index: number) => setPickupPoints((prev) => prev.filter((_, i) => i !== index));
  const updatePickupPoint = (index: number, patch: Partial<PickupPointDraft>) =>
    setPickupPoints((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const addPlant = () => setPlants((prev) => [...prev, { speciesName: '', priceRupees: '' }]);
  const removePlant = (index: number) => setPlants((prev) => prev.filter((_, i) => i !== index));
  const updatePlant = (index: number, patch: Partial<PlantDraft>) =>
    setPlants((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !address.trim() || !city.trim()) {
      setError('Title, description, address, and city are required.');
      return;
    }
    if (transportMode === 'ngo_provided' && pickupPoints.length === 0) {
      setError('Add at least one pickup point, or switch to "Volunteers make their own way".');
      return;
    }
    try {
      await createDriveMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        transportMode,
        pickupPoints:
          transportMode === 'ngo_provided'
            ? pickupPoints.map((p) => ({ address: p.address.trim(), arrivalBy: p.arrivalBy.toISOString() }))
            : undefined,
        plants: plants
          .filter((p) => p.speciesName.trim() && p.priceRupees)
          .map((p) => ({ speciesName: p.speciesName.trim(), priceCents: Math.round(Number(p.priceRupees) * 100) })),
        startsAt: startsAt.toISOString(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        photo: photo ?? undefined,
      });
      Alert.alert('Drive created', 'Your drive is live.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this drive. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Drive</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Cover photo</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>Choose photo</Text>}
          </TouchableOpacity>

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Riverside plantation drive" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholder="What volunteers will be doing" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Instructions for volunteers</Text>
          <TextInput style={[styles.input, styles.multiline]} value={instructions} onChangeText={setInstructions} multiline placeholder="What to carry, expected weather, meeting notes…" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} multiline placeholder="Plot / street / landmark" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Transport</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.transportChip, transportMode === 'self_arrange' && styles.transportChipSelected]}
              onPress={() => setTransportMode('self_arrange')}
            >
              <Text style={[styles.transportChipText, transportMode === 'self_arrange' && styles.transportChipTextSelected]}>
                Volunteers make their own way
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.transportChip, transportMode === 'ngo_provided' && styles.transportChipSelected]}
              onPress={() => setTransportMode('ngo_provided')}
            >
              <Text style={[styles.transportChipText, transportMode === 'ngo_provided' && styles.transportChipTextSelected]}>
                We'll help volunteers get there
              </Text>
            </TouchableOpacity>
          </View>

          {transportMode === 'ngo_provided' && (
            <View style={styles.subCard}>
              {pickupPoints.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>Stop {i + 1}</Text>
                    <TouchableOpacity onPress={() => removePickupPoint(i)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={p.address}
                    onChangeText={(v: string) => updatePickupPoint(i, { address: v })}
                    placeholder="Pickup address"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <DateField label="Reach by" value={p.arrivalBy} onChange={(d) => updatePickupPoint(i, { arrivalBy: d })} />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addPickupPoint}>
                <Text style={styles.addButtonText}>+ Add pickup point</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Plants to sponsor (optional)</Text>
          <View style={styles.subCard}>
            {plants.map((p, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemHeader}>
                  <Text style={styles.listItemTitle}>Plant {i + 1}</Text>
                  <TouchableOpacity onPress={() => removePlant(i)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={p.speciesName}
                  onChangeText={(v: string) => updatePlant(i, { speciesName: v })}
                  placeholder="Species name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TextInput
                  style={styles.input}
                  value={p.priceRupees}
                  onChangeText={(v: string) => updatePlant(i, { priceRupees: v.replace(/[^0-9]/g, '') })}
                  placeholder="₹ price to sponsor"
                  keyboardType="number-pad"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addPlant}>
              <Text style={styles.addButtonText}>+ Add plant</Text>
            </TouchableOpacity>
          </View>

          <DateField label="Starts at" value={startsAt} onChange={setStartsAt} />

          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput style={styles.input} value={durationMinutes} onChangeText={(v: string) => setDurationMinutes(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="No limit" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Capacity</Text>
          <TextInput style={styles.input} value={capacity} onChangeText={(v: string) => setCapacity(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="No limit" placeholderTextColor="rgba(255,255,255,0.4)" />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, createDriveMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createDriveMutation.isPending}
          >
            {createDriveMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Publish drive</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: 'rgba(13,35,24,0.45)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18, gap: 6 },
  subCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: 12, marginTop: 8, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4, justifyContent: 'center' },
  inputText: { fontSize: 15, color: COLORS.white },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  photoPicker: { marginTop: 6, height: 120, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  transportChip: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'transparent' },
  transportChipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  transportChipText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  transportChipTextSelected: { color: COLORS.white, fontWeight: '700' },
  listItem: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  removeText: { fontSize: 12, color: COLORS.coral, fontWeight: '600' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
