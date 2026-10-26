import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { FormField } from '../common/FormField';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { useUpdatePostCaption } from '../../hooks/useSocialQueries';
import { ApiError } from '../../api/client';
import type { ApiPost } from '../../api/posts';

const MAX_CAPTION = 2000;

/** Edit sheet for one of your own posts' captions (the API only allows the caption to change). */
export function PostCaptionSheet({ post, onClose }: { post: ApiPost | null; onClose: () => void }) {
  const update = useUpdatePostCaption();
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Re-seed whenever a different post is opened.
  useEffect(() => {
    setCaption(post?.caption ?? '');
    setError(null);
  }, [post?.id]);

  const save = async () => {
    if (!post) return;
    setError(null);
    const trimmed = caption.trim();
    // A post with neither photos nor text would be empty.
    if (!trimmed && post.media.length === 0) {
      setError('A post with no photos needs a caption.');
      return;
    }
    try {
      await update.mutateAsync({ id: post.id, caption: trimmed || null });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the caption. Please try again.");
    }
  };

  return (
    <Sheet visible={post !== null} onClose={onClose} title="Edit caption" scrollable>
      <View style={{ gap: 6 }}>
        <FormField
          label="Caption"
          value={caption}
          onChangeText={setCaption}
          placeholder="Say something about this post"
          maxLength={MAX_CAPTION}
          multiline
        />
        <Text style={styles.counter}>{caption.length}/{MAX_CAPTION}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AnimatedButton
          label={update.isPending ? 'Saving…' : 'Save caption'}
          onPress={save}
          disabled={update.isPending}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: 8 }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  counter: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  error: { fontSize: 13, color: COLORS.coral, textAlign: 'center' },
});
