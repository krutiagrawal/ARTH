import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput } from '../common/AppText';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { usePostStory } from '../../hooks/useApiQueries';

export function StoryPreviewModal({
  visible,
  imageBase64,
  onClose,
  onPosted,
}: {
  visible: boolean;
  imageBase64: string | null;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const postStoryMutation = usePostStory();
  const previewUri = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null;

  useEffect(() => {
    if (visible) setCaption('');
  }, [visible]);

  const handlePost = () => {
    if (!imageBase64) return;
    postStoryMutation.mutate(
      { imageBase64, caption },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPosted?.();
          onClose();
        },
        onError: () => {
          Alert.alert('Could not post', 'Something went wrong sharing your forest. Please try again.');
        },
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <StatusBar style="light" />
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <ActivityIndicator color={COLORS.sage} />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent']}
          style={[styles.topScrim, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.topBar}>
            <Text style={styles.title}>Share your forest</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomWrap}
        >
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bottomScrim}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={caption}
              onChangeText={setCaption}
              maxLength={280}
              multiline
            />
            <TouchableOpacity
              style={[styles.postButton, postStoryMutation.isPending && styles.postButtonDisabled]}
              onPress={handlePost}
              disabled={postStoryMutation.isPending || !imageBase64}
              activeOpacity={0.85}
            >
              {postStoryMutation.isPending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.postButtonText}>Post to Story  🌿</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>Visible to your friends for 24 hours · saved to your gallery</Text>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  topScrim: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  bottomWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomScrim: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 34,
    gap: 12,
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    maxHeight: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  postButton: {
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.full,
    paddingVertical: 15,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    color: COLORS.white,
    fontSize: 12,
    textAlign: 'center',
  },
});
