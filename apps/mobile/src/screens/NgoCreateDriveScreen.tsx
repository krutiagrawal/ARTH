import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useCreateDrive } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useSlideUp } from '../hooks/useAnimations';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useConfirm } from '../context/ConfirmDialogContext';

interface PickupPointDraft {
  address: string;
  arrivalBy: Date;
}

interface PlantDraft {
  speciesName: string;
  priceRupees: string;
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  // Android has no real combined "datetime" mode — the library fakes it by chaining a date
  // dialog into a time dialog internally, and unmounting the picker as soon as the first
  // (date) callback fires — which we used to do via `setShowPicker(false)` — tears down that
  // chain mid-flight and crashes with "Cannot read property 'dismiss' of undefined". Driving
  // the date→time sequence ourselves keeps the component mounted across both native dialogs.
  const [step, setStep] = useState<'date' | 'time' | null>(null);

  const handleChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'ios') {
      if (selected) onChange(selected);
      return;
    }
    if (event.type !== 'set' || !selected) {
      setStep(null);
      return;
    }
    if (step === 'date') {
      const next = new Date(value);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
      setStep('time');
    } else {
      const next = new Date(value);
      next.setHours(selected.getHours(), selected.getMinutes());
      onChange(next);
      setStep(null);
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setStep('date')}>
        <FormFieldShell label={label}>
          <Text style={styles.inputText}>{value.toLocaleString()}</Text>
        </FormFieldShell>
      </TouchableOpacity>
      {step && (
        <DateTimePicker
          value={value}
          mode={Platform.OS === 'ios' ? 'datetime' : step}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </>
  );
}

export function NgoCreateDriveScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createDriveMutation = useCreateDrive();
  const confirm = useConfirm();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Pune');
  const [transportMode, setTransportMode] = useState<'self_arrange' | 'ngo_provided'>('self_arrange');
  const [pickupPoints, setPickupPoints] = useState<PickupPointDraft[]>([]);
  const [plants, setPlants] = useState<PlantDraft[]>([]);
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [durationMinutes, setDurationMinutes] = useState('');
  const [capacity, setCapacity] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

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
      confirm('Drive created', 'Your drive is live.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this drive. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Create New Drive"
        subtitle="Tell us more about your drive"
        onBack={() => navigation?.goBack?.()}
        align="left"
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={cardAnim}>
          <PhotoPickerField
            photo={photo}
            onChange={setPhoto}
            mode="gallery"
            label="Add Cover Photo"
            hint="Showcase your drive"
            aspect={[16, 9]}
          />

          <FormField label="Drive Title" value={title} onChangeText={setTitle} placeholder="e.g. Riverbank Plantation Drive" />
          <FormField label="Description" value={description} onChangeText={setDescription} multiline placeholder="What will volunteers do?" />
          <FormField label="Instructions for Volunteers" value={instructions} onChangeText={setInstructions} multiline placeholder="What to carry, weather, meeting point" />
          <FormField label="Address" value={address} onChangeText={setAddress} multiline placeholder="Street / Landmark" />
          <CityPickerField value={city} onChange={setCity} />

          <Text style={styles.sectionLabel}>Transport</Text>
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
                  <FormField
                    label="Pickup address"
                    value={p.address}
                    onChangeText={(v: string) => updatePickupPoint(i, { address: v })}
                    placeholder="Where volunteers board"
                  />
                  <DateField label="Reach by" value={p.arrivalBy} onChange={(d) => updatePickupPoint(i, { arrivalBy: d })} />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addPickupPoint}>
                <Text style={styles.addButtonText}>+ Add pickup point</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionLabel}>Plants to sponsor (optional)</Text>
          <View style={styles.subCard}>
            {plants.map((p, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemHeader}>
                  <Text style={styles.listItemTitle}>Plant {i + 1}</Text>
                  <TouchableOpacity onPress={() => removePlant(i)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <FormField
                  label="Species name"
                  value={p.speciesName}
                  onChangeText={(v: string) => updatePlant(i, { speciesName: v })}
                  placeholder="e.g. Neem"
                />
                <FormField
                  label="Price to sponsor (₹)"
                  value={p.priceRupees}
                  onChangeText={(v: string) => updatePlant(i, { priceRupees: v.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  placeholder="250"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addPlant}>
              <Text style={styles.addButtonText}>+ Add plant</Text>
            </TouchableOpacity>
          </View>

          <DateField label="Starts at" value={startsAt} onChange={setStartsAt} />

          <FormField
            label="Duration (minutes)"
            value={durationMinutes}
            onChangeText={(v: string) => setDurationMinutes(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="No limit"
          />
          <FormField
            label="Capacity"
            value={capacity}
            onChangeText={(v: string) => setCapacity(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="No limit"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={createDriveMutation.isPending ? 'Publishing…' : 'Create Drive  →'}
            onPress={handleSubmit}
            disabled={createDriveMutation.isPending}
            fullWidth
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submitButton}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  // Transparent too: this only groups a run of FormFields, and a beige panel sitting directly
  // behind now-transparent fields would put the light block straight back where it was removed.
  subCard: { borderRadius: RADIUS.md, paddingHorizontal: 0, paddingVertical: 4, marginTop: 4, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 20 },
  inputText: { fontSize: 15, color: COLORS.textPrimary, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  transportChip: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: COLORS.beige, borderWidth: 1.5, borderColor: 'transparent' },
  transportChipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  transportChipText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  transportChipTextSelected: { color: COLORS.forest, fontWeight: '700' },
  listItem: { borderTopWidth: 1, borderTopColor: COLORS.sand, paddingTop: 8, marginTop: 4 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  removeText: { fontSize: 12, color: COLORS.coral, fontWeight: '600' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
