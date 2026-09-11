import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import * as Haptics from 'expo-haptics';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING, GLASS_DARK_STYLE } from '../../constants/theme';
import { usePostStory } from '../../hooks/useApiQueries';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { shareImageToInstagramStory } from '../../utils/shareToInstagram';

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
  const [caption, setCaption] = useState('');
  const postStoryMutation = usePostStory();
  const confirm = useConfirm();
  const previewUri = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null;

  useEffect(() => {
    if (visible) setCaption('');
  }, [visible]);

  const handleShareInstagram = () => {
    if (!previewUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shareImageToInstagramStory(previewUri, caption);
  };

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
          confirm('Could not post', 'Something went wrong sharing your forest. Please try again.');
        },
      }
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Share your forest" variant="slideUp">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.imageWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ActivityIndicator color={COLORS.sage} />
            </View>
          )}
          <View style={styles.captionOverlay}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption…"
              placeholderTextColor={ON_DARK_SURFACE.muted}
              value={caption}
              onChangeText={setCaption}
              maxLength={280}
              multiline
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.instagramButton, !imageBase64 && styles.postButtonDisabled]}
          onPress={handleShareInstagram}
          disabled={!imageBase64}
          activeOpacity={0.85}
        >
          <Text style={styles.instagramButtonText}>Share to Instagram  📸</Text>
        </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    height: 420,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.forestDeep,
    marginBottom: SPACING.md,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionOverlay: {
    position: 'absolute',
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: SPACING.sm,
  },
  captionInput: {
    ...GLASS_DARK_STYLE,
    color: ON_DARK_SURFACE.primary,
    fontSize: 16,
    fontWeight: '500',
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  instagramButton: {
    backgroundColor: 'rgba(135,168,120,0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    borderRadius: RADIUS.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  instagramButtonText: {
    color: COLORS.forest,
    fontSize: 16,
    fontWeight: '800',
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
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
