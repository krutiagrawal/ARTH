import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { CityPickerField } from '../components/common/CityPickerField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useCreateAdoptableTree, useUpdateAdoptableTree } from '../hooks/useApiQueries';
import type { ApiAdoptableTree } from '../api/adoptions';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

/** Edit mode: opened with `{ tree }` route params; otherwise lists a new tree. */
export function NgoCreateAdoptableTreeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const editing: ApiAdoptableTree | undefined = route?.params?.tree;
  const createTreeMutation = useCreateAdoptableTree();
  const updateTreeMutation = useUpdateAdoptableTree();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh();

  const [nickname, setNickname] = useState(editing?.nickname ?? '');
  const [speciesName, setSpeciesName] = useState(editing?.speciesName ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [instructions, setInstructions] = useState(editing?.instructions ?? '');
  const [locationLabel, setLocationLabel] = useState(editing?.location ?? '');
  const [city, setCity] = useState(editing?.city ?? 'Pune');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!nickname.trim() || !speciesName.trim() || !description.trim() || !city.trim()) {
      setError('Nickname, species, description, and city are required.');
      return;
    }
    try {
      if (editing) {
        await updateTreeMutation.mutateAsync({
          id: editing.id,
          nickname: nickname.trim(),
          speciesName: speciesName.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          locationLabel: locationLabel.trim(),
          city: city.trim(),
          photo: photo ?? undefined,
        });
        confirm('Tree updated', 'Your changes are saved.');
        navigation?.goBack?.();
        return;
      }
      await createTreeMutation.mutateAsync({
        nickname: nickname.trim(),
        speciesName: speciesName.trim(),
        description: description.trim(),
        instructions: instructions.trim() || undefined,
        locationLabel: locationLabel.trim() || undefined,
        city: city.trim(),
        photo: photo ?? undefined,
      });
      confirm('Tree listed', 'This tree is now available for adoption.');
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
        title={editing ? 'Edit Tree' : 'New Adoptable Tree'}
        subtitle={editing ? 'Update the listing adopters see' : 'List a tree for someone to adopt'}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <View>
          <PhotoPickerField
            photo={photo}
            existingUri={editing?.photoUri}
            onChange={setPhoto}
            mode="gallery"
            label="Add Photo"
            hint="Show the tree at its best"
          />

          <FormField maxLength={60}
            required label="Tree nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="eg - Grandmother Banyan"
          />

          <FormField maxLength={100}
            required label="Species"
            value={speciesName}
            onChangeText={setSpeciesName}
            placeholder="eg - Banyan"
          />

          <FormField maxLength={2000}
            required label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="eg - Tell the tree's story"
            multiline
          />

          <FormField maxLength={2000}
            label="Instructions for adopters"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="eg - What adopting this tree involves, visiting notes, etc."
            multiline
          />

          <AddressSearchField
            label="Area / landmark"
            allowCurrentLocation
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="eg - Optional"
          />

          <CityPickerField required value={city} onChange={setCity} />

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={
              createTreeMutation.isPending || updateTreeMutation.isPending
                ? editing ? 'Saving…' : 'Listing…'
                : editing ? 'Save changes' : 'List for Adoption  →'
            }
            onPress={handleSubmit}
            disabled={createTreeMutation.isPending || updateTreeMutation.isPending}
            fullWidth
            gradientColors={[COLORS.forest, COLORS.forestDeep]}
            style={styles.submitButton}
          />
        </View>
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
