import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { shareImage, type ShareTarget } from '../../utils/shareToInstagram';

interface ShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  caption?: string;
  /** The branded, moment-specific card content — rendered at a Stories-friendly 9:16 aspect and
   * captured as the shared image once it settles on screen. */
  children: React.ReactNode;
  /** Set to false while the card is still loading something async (e.g. a photo) so the capture
   * waits for it. A safety timeout still captures if it never flips. Defaults to true. */
  ready?: boolean;
}

const SHARE_TARGETS: { target: ShareTarget; label: string; icon: string }[] = [
  { target: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { target: 'instagram', label: 'Instagram', icon: '📸' },
  { target: 'instagramStory', label: 'Story', icon: '✨' },
  { target: 'twitter', label: 'X', icon: '𝕏' },
  { target: 'other', label: 'More', icon: '⋯' },
];

// If a card never reports ready, capture anyway rather than leaving the buttons disabled.
const READY_TIMEOUT_MS = 3000;
// Handle + title row + padding + the share buttons row + the "preparing" caption, roughly.
const SHEET_CHROME_HEIGHT = 250;
// Shared image resolution (the on-screen card is smaller than a Stories-sized image).
const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 1920;

/**
 * Generalizes the capture-then-share flow already proven in ForestScreen's snapshot feature
 * (render → captureRef → share) so any "flaunt this" moment can reuse it with its own card
 * content instead of building its own capture plumbing.
 */
export function ShareCardModal({ visible, onClose, title = 'Share your moment', caption, children, ready = true }: ShareCardModalProps) {
  const cardRef = useRef<View>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const confirm = useConfirm();
  const [timedOut, setTimedOut] = useState(false);

  // The Sheet is capped at 85% of the screen height and isn't scrollable, so a full-width 9:16
  // card (taller than the screen on most phones) pushed the share buttons off the bottom. Size the
  // card to whatever height is left after the sheet chrome + the buttons, keeping 9:16.
  const { width: winW, height: winH } = useWindowDimensions();
  const cardWidth = Math.min(winW - SPACING.lg * 2, ((winH * 0.85 - SHEET_CHROME_HEIGHT) * 9) / 16);

  useEffect(() => {
    if (!visible) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setCapturedUri(null);
      return;
    }
    if (!ready && !timedOut) return;
    // Let the card's layout settle before capturing — same reasoning as ForestScreen's
    // handleSnapshot delay.
    const timer = setTimeout(async () => {
      try {
        const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.92, result: 'data-uri', width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT });
        setCapturedUri(uri);
      } catch {
        confirm('Could not prepare image', 'Please try again.');
        onClose();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, ready, timedOut]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} variant="slideUp" surface="dark" surfaceColor={COLORS.sageDark}>
      <View ref={cardRef} collapsable={false} style={[styles.card, { width: cardWidth }]}>
        {children}
      </View>

      <View style={styles.actions}>
        <View style={styles.targetRow}>
          {SHARE_TARGETS.map(({ target, label, icon }) => (
            <TouchableOpacity
              key={target}
              style={[styles.target, !capturedUri && styles.targetDisabled]}
              activeOpacity={0.7}
              disabled={!capturedUri}
              onPress={() => capturedUri && shareImage(target, capturedUri, caption)}
            >
              <View style={styles.targetIcon}>
                <Text style={styles.targetIconText}>{icon}</Text>
              </View>
              <Text style={styles.targetLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!capturedUri && <Text style={styles.preparingText}>Preparing your image…</Text>}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    aspectRatio: 9 / 16,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.forestDeep,
    marginBottom: SPACING.md,
  },
  actions: {
    gap: SPACING.sm,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  target: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  targetDisabled: {
    opacity: 0.45,
  },
  targetIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  targetIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  targetLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
  },
  preparingText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});
