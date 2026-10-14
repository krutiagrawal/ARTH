import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './AppText';
import { Sheet } from './Sheet';
import { AnimatedButton } from './AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { submitFeedback, type FeedbackCategory } from '../../api/feedback';

const MAX_LENGTH = 1000;

const RATINGS = [
  { value: 1, emoji: '😭', label: 'Awful' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Fine' },
  { value: 4, emoji: '😍', label: 'Love it' },
  { value: 5, emoji: '🥳', label: 'Fantastic' },
];

const CATEGORIES: { key: FeedbackCategory; label: string; icon: string; placeholder: string }[] = [
  { key: 'bug', label: 'Bug', icon: '🐞', placeholder: 'What went wrong? What were you doing when it happened?' },
  { key: 'idea', label: 'Idea', icon: '💡', placeholder: 'What would make ARTH better for you?' },
  { key: 'praise', label: 'Praise', icon: '💐', placeholder: 'What do you love about ARTH?' },
  { key: 'other', label: 'Other', icon: '✉️', placeholder: 'Tell us anything on your mind…' },
];

/** Settings > Send Feedback: rating, category and a typed message in a dialog. */
export function FeedbackSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { selection, success, error: errorHaptic } = useHaptics();
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(null);
      setCategory('idea');
      setMessage('');
      setSending(false);
      setSent(false);
      setFailed(false);
    }
  }, [visible]);

  const trimmed = message.trim();
  const active = CATEGORIES.find(c => c.key === category)!;

  const handleSend = async () => {
    if (!trimmed || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await submitFeedback({ rating, category, message: trimmed });
      success();
      setSent(true);
    } catch {
      errorHaptic();
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={sent ? undefined : 'Send Feedback'} variant="slideUp" scrollable>
      {sent ? (
        <View style={styles.thanks}>
          <Text style={styles.thanksEmoji}>💚</Text>
          <Text style={styles.thanksTitle}>Thank you!</Text>
          <Text style={styles.thanksBody}>Your feedback helps us grow ARTH.</Text>
          <AnimatedButton label="Done" onPress={onClose} variant="ghost" fullWidth style={styles.thanksBtn} textStyle={styles.outlineText} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.label}>How is your experience?</Text>
          <View style={styles.ratingRow}>
            {RATINGS.map(r => {
              const selected = rating === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.ratingItem, selected && styles.ratingItemSelected]}
                  onPress={() => { selection(); setRating(selected ? null : r.value); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={r.label}
                >
                  <Text style={[styles.ratingEmoji, !selected && rating !== null && styles.dim]}>{r.emoji}</Text>
                  {selected && <Text style={styles.ratingLabel}>{r.label}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>What is it about?</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => {
              const selected = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => { selection(); setCategory(c.key); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.icon} {c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={t => { setMessage(t); if (failed) setFailed(false); }}
            placeholder={active.placeholder}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={MAX_LENGTH}
            textAlignVertical="top"
            editable={!sending}
          />
          <Text style={styles.counter}>{message.length}/{MAX_LENGTH}</Text>

          {failed && <Text style={styles.error}>Could not send right now. Please try again.</Text>}

          <AnimatedButton
            label={sending ? 'Sending…' : 'Send Feedback'}
            onPress={handleSend}
            disabled={!trimmed || sending}
            variant="ghost"
            fullWidth
            style={[styles.send, (!trimmed || sending) && styles.sendDisabled] as any}
            textStyle={styles.outlineText}
          />
        </KeyboardAvoidingView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingItem: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: 'transparent' },
  ratingItemSelected: { borderColor: COLORS.earth },
  ratingEmoji: { fontSize: 30 },
  ratingLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  dim: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.earth },
  chipSelected: { borderColor: COLORS.earthDark, borderWidth: 2.5 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  chipTextSelected: { color: COLORS.earthDark },
  input: {
    marginTop: SPACING.md,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.earth,
    borderRadius: RADIUS.lg,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  error: { fontSize: 12, color: COLORS.coral, marginTop: 4 },
  send: { marginTop: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.earth, borderRadius: RADIUS.lg },
  sendDisabled: { opacity: 0.45 },
  outlineText: { color: COLORS.earthDark },
  thanks: { alignItems: 'center', paddingVertical: SPACING.lg },
  thanksEmoji: { fontSize: 52 },
  thanksTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  thanksBody: { fontSize: 14, color: COLORS.textPrimary, marginTop: 4, textAlign: 'center' },
  thanksBtn: { marginTop: SPACING.lg, borderWidth: 1.5, borderColor: COLORS.earth, borderRadius: RADIUS.lg },
});
