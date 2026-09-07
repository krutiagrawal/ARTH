import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useSlideUp } from '../hooks/useAnimations';
import { useCreateCampaign } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

export function NgoCreateCampaignScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateCampaign();
  const confirm = useConfirm();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalRupees, setGoalRupees] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goalAmountCents: goalRupees ? Math.round(Number(goalRupees) * 100) : undefined,
        photo: photo ?? undefined,
      });
      confirm('Campaign created', 'Your donation campaign is live.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create this campaign. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="New Campaign"
        subtitle="Raise funds for your next planting push"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={cardAnim}>
          <PhotoPickerField
            photo={photo}
            onChange={setPhoto}
            mode="gallery"
            label="Add Cover Photo"
            hint="Showcase your campaign"
          />

          <FormField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Plant 1,000 trees this monsoon"
          />

          <FormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What this campaign funds"
            multiline
          />

          <FormField
            label="Goal (₹, optional)"
            value={goalRupees}
            onChangeText={(v: string) => setGoalRupees(v.replace(/[^0-9]/g, ''))}
            placeholder="No limit"
            keyboardType="number-pad"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={createMutation.isPending ? 'Publishing…' : 'Publish Campaign  →'}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
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
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
