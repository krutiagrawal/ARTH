import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
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
import { useCreateAdoptableTree } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';

export function NgoCreateAdoptableTreeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const createTreeMutation = useCreateAdoptableTree();

  const [nickname, setNickname] = useState('');
  const [speciesName, setSpeciesName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [city, setCity] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

  const handleSubmit = async () => {
    setError(null);
    if (!nickname.trim() || !speciesName.trim() || !description.trim() || !city.trim()) {
      setError('Nickname, species, description, and city are required.');
      return;
    }
    try {
      await createTreeMutation.mutateAsync({
        nickname: nickname.trim(),
        speciesName: speciesName.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        locationLabel: locationLabel.trim() || undefined,
        city: city.trim(),
        photo: photo ?? undefined,
      });
      Alert.alert('Tree listed', 'This tree is now available for adoption.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not list this tree. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="New Adoptable Tree"
        subtitle="List a tree for someone to adopt"
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={cardAnim}>
          <PhotoPickerField
            photo={photo}
            onChange={setPhoto}
            mode="gallery"
            label="Add Photo"
            hint="Show the tree at its best"
          />

          <FormField
            label="Tree nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Grandmother Banyan"
          />

          <FormField
            label="Species"
            value={speciesName}
            onChangeText={setSpeciesName}
            placeholder="Banyan"
          />

          <FormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell the tree's story"
            multiline
          />

          <FormField
            label="Instructions for adopters"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="What adopting this tree involves, visiting notes, etc."
            multiline
          />

          <FormField
            label="Area / landmark"
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Optional"
          />

          <FormField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="City"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={createTreeMutation.isPending ? 'Listing…' : 'List for Adoption  →'}
            onPress={handleSubmit}
            disabled={createTreeMutation.isPending}
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
