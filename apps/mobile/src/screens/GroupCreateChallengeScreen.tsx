import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { useCreateGroupChallenge } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useSlideUp } from '../hooks/useAnimations';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useConfirm } from '../context/ConfirmDialogContext';

const GOAL_TYPES: { value: 'trees_planted_count' | 'cities_count' | 'streak_days' | 'rare_species_count'; label: string }[] = [
  { value: 'trees_planted_count', label: 'Trees planted' },
  { value: 'cities_count', label: 'Cities reached' },
  { value: 'streak_days', label: 'Streak days' },
  { value: 'rare_species_count', label: 'Rare species' },
];

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPicker(true)}>
        <FormFieldShell label={label}>
          <Text style={styles.inputText}>{value.toLocaleString()}</Text>
        </FormFieldShell>
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

export function GroupCreateChallengeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const createChallengeMutation = useCreateGroupChallenge();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<typeof GOAL_TYPES[number]['value']>('trees_planted_count');
  const [goalTotal, setGoalTotal] = useState('');
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !goalTotal) {
      setError('Title, description, and a goal total are required.');
      return;
    }
    if (endsAt <= startsAt) {
      setError('The end date must be after the start date.');
      return;
    }
    try {
      await createChallengeMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goalType,
        goalTotal: Number(goalTotal),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      });
      confirm('Challenge created', 'Your group can start joining it now.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this challenge. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="New Challenge" subtitle="Set a shared goal for your group" onBack={() => navigation?.goBack?.()} align="left" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={cardAnim}>
          <FormField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Monsoon Sprint" />
          <FormField label="Description" value={description} onChangeText={setDescription} multiline placeholder="What are you working toward?" />

          <Text style={styles.sectionLabel}>Goal type</Text>
          <View style={styles.chipRow}>
            {GOAL_TYPES.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.chip, goalType === g.value && styles.chipSelected]}
                onPress={() => setGoalType(g.value)}
              >
                <Text style={[styles.chipText, goalType === g.value && styles.chipTextSelected]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormField
            label="Goal total"
            value={goalTotal}
            onChangeText={(v: string) => setGoalTotal(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 100"
          />

          <DateField label="Starts at" value={startsAt} onChange={setStartsAt} />
          <DateField label="Ends at" value={endsAt} onChange={setEndsAt} />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={createChallengeMutation.isPending ? 'Creating…' : 'Create Challenge  →'}
            onPress={handleSubmit}
            disabled={createChallengeMutation.isPending}
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
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 20 },
  inputText: { fontSize: 15, color: COLORS.textPrimary, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: COLORS.beige, borderWidth: 1.5, borderColor: 'transparent' },
  chipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.forest, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
