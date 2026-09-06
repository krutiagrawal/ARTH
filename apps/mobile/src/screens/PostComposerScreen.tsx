import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { MultiPhotoPickerField } from '../components/social/MultiPhotoPickerField';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import { useSlideUp } from '../hooks/useAnimations';
import { useMyDrives, useNgoProfile, useNurseryProfile } from '../hooks/useApiQueries';
import { useCreatePost } from '../hooks/useSocialQueries';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAuth } from '../context/AuthContext';
import { postPhotoStory } from '../api/stories';
import { ApiError } from '../api/client';

type Mode = 'post' | 'story';

/**
 * Composer for both permanent posts and 24-hour stories.
 *
 * Replaces the old camera-only NGO update screen. Gallery is allowed now because an NGO
 * documenting a drive is usually posting afterwards from photos its volunteers took, not live
 * from the field — the "happening right now" guarantee moved to Stories, which expire.
 */
export function PostComposerScreen({ navigation, route }: any) {
  const bottomClearance = useBottomNavClearance();
  const { user } = useAuth();
  const { data: ngoProfile } = useNgoProfile();
  const { data: nurseryProfile } = useNurseryProfile();
  const { data: drives = [] } = useMyDrives();
  const createPost = useCreatePost();

  const groupId: string | undefined = route?.params?.groupId;
  // A group post is a member posting as themselves, tagged to the group — never the
  // NGO-style authorship switch, so the two contexts are mutually exclusive.
  const isNgo = !groupId && user?.role === 'ngo';
  const canPublishAsNgo = isNgo && ngoProfile?.status === 'approved';
  const isNursery = !groupId && user?.role === 'nursery';
  const canPublishAsNursery = isNursery && nurseryProfile?.status === 'approved';
  // The Group account's own login (no groupId param, distinct from a member tagging a post to
  // their group above) publishing as the group itself — Group has no approval gate, so always on.
  const isGroupAccount = !groupId && user?.role === 'group';
  const canPublishAsGroup = isGroupAccount;
  // A Group account only authors Stories today (its forest gallery) — permanent Post authorship
  // for groups isn't modeled on the backend yet, so the 'post' tab is hidden for it.
  const availableModes: Mode[] = isGroupAccount ? ['story'] : ['post', 'story'];

  const [mode, setMode] = useState<Mode>(isGroupAccount ? 'story' : 'post');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [driveId, setDriveId] = useState<string | undefined>(undefined);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);

  const reset = () => {
    setPhotos([]);
    setCaption('');
    setDriveId(undefined);
  };

  const submitPost = async () => {
    if (photos.length === 0 && !caption.trim()) {
      setError('Add at least one photo or write something.');
      return;
    }
    try {
      await createPost.mutateAsync({
        caption: caption.trim() || undefined,
        driveId,
        groupId,
        photos,
        asNgo: canPublishAsNgo,
        asNursery: canPublishAsNursery,
      });
      reset();
      Alert.alert(
        'Posted',
        groupId ? 'Shared to your group.' : canPublishAsNgo || canPublishAsNursery ? 'Your followers can see this now.' : 'Shared with your friends.'
      );
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post. Please try again.');
    }
  };

  const submitStory = async () => {
    if (photos.length === 0) {
      setError('Pick a photo for your story.');
      return;
    }
    setPosting(true);
    try {
      // Stories are one image by design; anything past the first is ignored rather than rejected.
      await postPhotoStory({
        photo: photos[0],
        caption: caption.trim() || undefined,
        asNgo: canPublishAsNgo,
        asGroup: canPublishAsGroup,
        asNursery: canPublishAsNursery,
      });
      reset();
      Alert.alert('Story posted', 'It disappears in 24 hours.');
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post this story. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const busy = createPost.isPending || posting;

  const handleSubmit = () => {
    setError(null);
    if (mode === 'story') submitStory();
    else submitPost();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title={mode === 'post' ? (groupId ? 'New group update' : 'New post') : 'New story'}
        subtitle={
          mode === 'post'
            ? groupId
              ? 'Shared to your group'
              : 'Stays on your profile'
            : 'Disappears after 24 hours'
        }
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={cardAnim}>
          <View style={styles.modeRow}>
            {availableModes.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, mode === m && styles.modeTabActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {m === 'post' ? '🖼  Post' : '⏱  Story'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isNgo && !canPublishAsNgo && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Your NGO is not approved yet, so this will publish from your personal account
                rather than from {ngoProfile?.orgName ?? 'your organisation'}.
              </Text>
            </View>
          )}

          {isNursery && !canPublishAsNursery && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Your nursery is not approved yet, so this will publish from your personal account
                rather than from {nurseryProfile?.nurseryName ?? 'your nursery'}.
              </Text>
            </View>
          )}

          <MultiPhotoPickerField
            photos={photos}
            onChange={setPhotos}
            max={mode === 'story' ? 1 : 6}
            mode="both"
            label={mode === 'story' ? 'Story photo' : 'Photos'}
            hint={
              mode === 'story'
                ? 'One photo, gone in 24 hours.'
                : 'Up to 6 — the first one is the cover, and people swipe through the rest.'
            }
          />

          <FormField
            label={mode === 'story' ? 'Caption (optional)' : "What's happening?"}
            value={caption}
            onChangeText={setCaption}
            multiline
            placeholder={
              mode === 'story'
                ? 'A quick line about this moment…'
                : 'Tell people what you planted, where, and who showed up…'
            }
          />

          {mode === 'post' && canPublishAsNgo && drives.length > 0 && (
            <>
              <Text style={styles.label}>Related drive (optional)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !driveId && styles.chipSelected]}
                  onPress={() => setDriveId(undefined)}
                >
                  <Text style={[styles.chipText, !driveId && styles.chipTextSelected]}>None</Text>
                </TouchableOpacity>
                {drives.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.chip, driveId === d.id && styles.chipSelected]}
                    onPress={() => setDriveId(d.id)}
                  >
                    <Text
                      style={[styles.chipText, driveId === d.id && styles.chipTextSelected]}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <AnimatedButton
            label={busy ? 'Posting…' : mode === 'post' ? '✈  Share post' : '✈  Share story'}
            onPress={handleSubmit}
            disabled={busy}
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
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    backgroundColor: COLORS.beigeLight,
    borderWidth: 1.5,
    borderColor: COLORS.sand,
  },
  modeTabActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  modeText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  modeTextActive: { color: COLORS.white },
  warning: {
    backgroundColor: 'rgba(232,184,75,0.18)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
  label: {
    fontFamily: FONTS.display,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.beige,
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: 160,
  },
  chipSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.25)' },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.forest, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.danger, marginTop: 12 },
  submitButton: { marginTop: 20 },
});
