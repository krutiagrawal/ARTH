import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
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

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Adoptable Tree</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Photo</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>Choose photo</Text>}
          </TouchableOpacity>

          <Text style={styles.label}>Tree nickname</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="Grandmother Banyan" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Species</Text>
          <TextInput style={styles.input} value={speciesName} onChangeText={setSpeciesName} placeholder="Banyan" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholder="Tell the tree's story" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>Instructions for adopters</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            placeholder="What adopting this tree involves, visiting notes, etc."
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.label}>Area / landmark</Text>
          <TextInput style={styles.input} value={locationLabel} onChangeText={setLocationLabel} placeholder="Optional" placeholderTextColor="rgba(255,255,255,0.4)" />

          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="rgba(255,255,255,0.4)" />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, createTreeMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createTreeMutation.isPending}
          >
            {createTreeMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>List for adoption</Text>}
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
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  photoPicker: { marginTop: 6, height: 120, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
