import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField, FormFieldShell } from '../components/common/FormField';
import { OptionCard } from '../components/common/OptionCard';
import { useSlideUp } from '../hooks/useAnimations';
import { usePersonalizeMe } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { PersonalizeInput } from '../api/users';

import { TEXT } from '../constants/typography';
type StepKey = 'space' | 'sunlight' | 'experience' | 'motivation' | 'species' | 'goal' | 'dob';
type StepType = 'single' | 'multi' | 'number' | 'date';

interface Option {
  value: string;
  label: string;
  icon: string;
}

interface StepDef {
  key: StepKey;
  type: StepType;
  emoji: string;
  question: string;
  helper?: string;
  options?: Option[];
}

const SPACE_OPTIONS: Option[] = [
  { value: 'balcony', label: 'Balcony', icon: '🪴' },
  { value: 'terrace', label: 'Terrace', icon: '🏠' },
  { value: 'garden', label: 'Garden', icon: '🌳' },
  { value: 'farmland', label: 'Farmland', icon: '🌾' },
  { value: 'city_outskirts', label: 'In and around the city', icon: '🏙️' },
  { value: 'open_land', label: 'Open land or hillsides', icon: '⛰️' },
  { value: 'none', label: "I don't have space yet", icon: '🤷' },
];

const SUNLIGHT_OPTIONS: Option[] = [
  { value: 'full_sun', label: 'Full sun most of the day', icon: '☀️' },
  { value: 'partial_shade', label: 'Partial shade', icon: '⛅' },
  { value: 'shade', label: 'Mostly shaded', icon: '🌥️' },
];

const EXPERIENCE_OPTIONS: Option[] = [
  { value: 'beginner', label: "I'm just starting out", icon: '🌱' },
  { value: 'intermediate', label: "I've grown a few plants", icon: '🌿' },
  { value: 'experienced', label: 'I know my way around a garden', icon: '🌳' },
];

const MOTIVATION_OPTIONS: Option[] = [
  { value: 'home_gardening', label: 'Growing things at home', icon: '🏡' },
  { value: 'environmental_cause', label: 'The environmental cause', icon: '🌍' },
  { value: 'school_or_csr_project', label: 'A school or CSR project', icon: '🏫' },
  { value: 'hobby', label: "It's just a hobby", icon: '🎨' },
  { value: 'other', label: 'Something else', icon: '✨' },
];

const SPECIES_OPTIONS: Option[] = [
  { value: 'fruit', label: 'Fruit trees', icon: '🍎' },
  { value: 'flowering', label: 'Flowering trees', icon: '🌸' },
  { value: 'shade', label: 'Shade trees', icon: '🌳' },
  { value: 'medicinal', label: 'Medicinal plants', icon: '🌿' },
  { value: 'native', label: 'Native species', icon: '🍃' },
];

const ALL_STEPS: StepDef[] = [
  { key: 'space', type: 'multi', emoji: '🏡', question: 'Where will you be planting?', helper: 'Pick as many as you like', options: SPACE_OPTIONS },
  { key: 'sunlight', type: 'single', emoji: '☀️', question: 'How much sunlight does that spot get?', options: SUNLIGHT_OPTIONS },
  { key: 'experience', type: 'single', emoji: '🌱', question: 'How much gardening experience do you have?', options: EXPERIENCE_OPTIONS },
  { key: 'motivation', type: 'multi', emoji: '💚', question: 'What brings you to ARTH?', helper: 'Pick as many as you like', options: MOTIVATION_OPTIONS },
  { key: 'species', type: 'multi', emoji: '🌿', question: 'Which trees interest you most?', helper: 'Pick as many as you like', options: SPECIES_OPTIONS },
  { key: 'goal', type: 'number', emoji: '🎯', question: 'Got a planting goal in mind?', helper: "Trees you'd like to plant this year" },
  { key: 'dob', type: 'date', emoji: '🎂', question: "When's your birthday?" },
];

interface Answers {
  space: string[];
  sunlight: string;
  experience: string;
  motivation: string[];
  species: string[];
  goal: string;
  dob: Date | null;
}

const INITIAL_ANSWERS: Answers = {
  space: [],
  sunlight: '',
  experience: '',
  motivation: [],
  species: [],
  goal: '',
  dob: null,
};

// Sunlight only makes sense if at least one selected space is an actual fixed personal spot —
// skip it if everything picked is "no space", or open/public land with no one spot to describe.
const PERSONAL_SPOT_VALUES = ['balcony', 'terrace', 'garden', 'farmland'];
function visibleSteps(answers: Answers): StepDef[] {
  const hasPersonalSpot = answers.space.some((v) => PERSONAL_SPOT_VALUES.includes(v));
  return ALL_STEPS.filter((s) => !(s.key === 'sunlight' && !hasPersonalSpot));
}

function QuestionView({
  step,
  answers,
  onSelectSingle,
  onToggleMulti,
  onChangeGoal,
  onChangeDob,
}: {
  step: StepDef;
  answers: Answers;
  onSelectSingle: (value: string) => void;
  onToggleMulti: (value: string) => void;
  onChangeGoal: (value: string) => void;
  onChangeDob: (date: Date) => void;
}) {
  const anim = useSlideUp(0, 16);
  const [dateOpen, setDateOpen] = useState(false);

  const handleDateChange = (event: any, selected?: Date) => {
    if (Platform.OS !== 'ios') setDateOpen(false);
    if (event.type !== 'dismissed' && selected) onChangeDob(selected);
  };

  return (
    <Animated.View style={[styles.questionWrap, anim]}>
      <Text style={styles.emoji}>{step.emoji}</Text>
      <Text style={styles.question}>{step.question}</Text>
      {step.helper && <Text style={styles.helper}>{step.helper}</Text>}

      <View style={styles.optionsWrap}>
        {step.type === 'single' &&
          step.options!.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={answers[step.key as 'sunlight' | 'experience'] === opt.value}
              onPress={() => onSelectSingle(opt.value)}
            />
          ))}

        {step.type === 'multi' &&
          step.options!.map((opt) => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={(answers[step.key as 'space' | 'motivation' | 'species'] as string[]).includes(opt.value)}
              onPress={() => onToggleMulti(opt.value)}
            />
          ))}

        {step.type === 'number' && (
          <FormField
            label="Trees per year"
            dark
            value={answers.goal}
            onChangeText={(t) => onChangeGoal(t.replace(/\D/g, ''))}
            placeholder="e.g. 12"
            keyboardType="number-pad"
          />
        )}

        {step.type === 'date' && (
          <>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setDateOpen(true)}>
              <FormFieldShell label="Date of birth" dark>
                <Text style={styles.dateText}>{answers.dob ? answers.dob.toLocaleDateString() : 'Select a date'}</Text>
              </FormFieldShell>
            </TouchableOpacity>
            {dateOpen && (
              <DateTimePicker
                value={answers.dob ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
}

export function PersonalizeOnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const personalizeMutation = usePersonalizeMe();
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = visibleSteps(answers);
  const step = steps[stepIndex];

  const finish = async (finalAnswers: Answers) => {
    try {
      const payload: PersonalizeInput = {
        plantingSpace: finalAnswers.space.length ? (finalAnswers.space as PersonalizeInput['plantingSpace']) : undefined,
        homeSunlight: (finalAnswers.sunlight || undefined) as PersonalizeInput['homeSunlight'],
        gardeningExperience: (finalAnswers.experience || undefined) as PersonalizeInput['gardeningExperience'],
        motivation: finalAnswers.motivation.length ? (finalAnswers.motivation as PersonalizeInput['motivation']) : undefined,
        speciesInterest: finalAnswers.species.length ? (finalAnswers.species as PersonalizeInput['speciesInterest']) : undefined,
        plantingGoal: finalAnswers.goal ? Number(finalAnswers.goal) : undefined,
        dateOfBirth: finalAnswers.dob ? finalAnswers.dob.toISOString() : undefined,
      };
      await personalizeMutation.mutateAsync(payload);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const goNext = (nextAnswers: Answers = answers) => {
    setError(null);
    setAnswers(nextAnswers);
    const nextSteps = visibleSteps(nextAnswers);
    if (stepIndex < nextSteps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finish(nextAnswers);
    }
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));
  const skip = () => goNext();
  // Every question type needs the same "pick, then tap Continue" rhythm — a single-select that
  // auto-advanced on tap while everything else waited for Continue read as an inconsistent UI.
  const selectSingle = (value: string) => setAnswers((a) => ({ ...a, [step.key]: value }));
  const toggleMulti = (value: string) => {
    const current = answers[step.key as 'space' | 'motivation' | 'species'] as string[];
    const set = new Set(current);
    set.has(value) ? set.delete(value) : set.add(value);
    setAnswers({ ...answers, [step.key]: Array.from(set) });
  };

  const isLast = stepIndex === steps.length - 1;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forestDeep, COLORS.forest, COLORS.sage]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        {stepIndex > 0 ? (
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backArrowPlaceholder} />
        )}

        <View style={styles.progressRow}>
          {steps.map((s, i) => (
            <View key={s.key} style={styles.progressTrack}>
              <View style={[styles.progressFill, i <= stepIndex && styles.progressFillActive]} />
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={skip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={personalizeMutation.isPending}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <QuestionView
        key={step.key}
        step={step}
        answers={answers}
        onSelectSingle={selectSingle}
        onToggleMulti={toggleMulti}
        onChangeGoal={(v) => setAnswers((a) => ({ ...a, goal: v }))}
        onChangeDob={(d) => setAnswers((a) => ({ ...a, dob: d }))}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        {error && <Text style={styles.error}>{error}</Text>}
        <AnimatedButton
          label={isLast ? (personalizeMutation.isPending ? 'Saving…' : 'Finish') : 'Continue →'}
          onPress={() => goNext()}
          disabled={personalizeMutation.isPending}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backArrow: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  backArrowPlaceholder: { width: 20 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 4 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2, width: 0 },
  progressFillActive: { width: '100%', backgroundColor: COLORS.mint },
  skipText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  questionWrap: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  emoji: { fontSize: 40, marginBottom: SPACING.md },
  question: {
    ...TEXT.title,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  helper: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: SPACING.xs,
  },
  optionsWrap: { marginTop: SPACING.xl },
  dateText: { fontSize: 15, fontWeight: '600', color: COLORS.white, paddingVertical: 4 },
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  error: { fontSize: 13, color: COLORS.coral, marginBottom: SPACING.sm, textAlign: 'center' },
});
