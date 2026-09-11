import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { AnimatedButton } from './AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { shareImageToInstagramStory, shareImageGeneric } from '../../utils/shareToInstagram';

interface ShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  caption?: string;
  /** The branded, moment-specific card content — rendered at a Stories-friendly 9:16 aspect and
   * captured as the shared image once it settles on screen. */
  children: React.ReactNode;
}

/**
 * Generalizes the capture-then-share flow already proven in ForestScreen's snapshot feature
 * (render → captureRef → share) so any "flaunt this" moment can reuse it with its own card
 * content instead of building its own capture plumbing.
 */
export function ShareCardModal({ visible, onClose, title = 'Share your moment', caption, children }: ShareCardModalProps) {
  const cardRef = useRef<View>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!visible) {
      setCapturedUri(null);
      return;
    }
    // Let the card's layout settle before capturing — same reasoning as ForestScreen's
    // handleSnapshot delay.
    const timer = setTimeout(async () => {
      try {
        const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.92, result: 'data-uri' });
        setCapturedUri(uri);
      } catch {
        confirm('Could not prepare image', 'Please try again.');
        onClose();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} variant="slideUp">
      <View ref={cardRef} collapsable={false} style={styles.card}>
        {children}
      </View>

      <View style={styles.actions}>
        <AnimatedButton
          label="Share to Instagram"
          icon="📸"
          variant="primary"
          fullWidth
          disabled={!capturedUri}
          onPress={() => capturedUri && shareImageToInstagramStory(capturedUri, caption)}
        />
        <AnimatedButton
          label="More options"
          variant="secondary"
          fullWidth
          disabled={!capturedUri}
          style={styles.moreButton}
          onPress={() => capturedUri && shareImageGeneric(capturedUri, caption)}
        />
        {!capturedUri && <Text style={styles.preparingText}>Preparing your image…</Text>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.forestDeep,
    marginBottom: SPACING.md,
  },
  actions: {
    gap: SPACING.sm,
  },
  moreButton: {
    marginTop: 0,
  },
  preparingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
