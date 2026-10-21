import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { FormField } from '../common/FormField';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { RsvpCancelReason } from '../../api/drives';

const REASONS: { value: RsvpCancelReason; label: string }[] = [
  { value: 'schedule_clash', label: 'Schedule clash' },
  { value: 'unwell', label: 'Not feeling well' },
  { value: 'transport', label: 'Can’t arrange transport' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

interface Props {
  visible: boolean;
  driveTitle: string;
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: { reason: RsvpCancelReason; note?: string }) => void;
}

/** Short "why are you cancelling?" form – the organiser is told the reason so they can plan around it. */
export function CancelRsvpSheet({ visible, driveTitle, submitting, error, onClose, onSubmit }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const [reason, setReason] = useState<RsvpCancelReason | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setReason(null);
    setNote('');
    setTried(false);
  }, [visible]);

  const noteRequired = reason === 'other';
  const noteError = tried && noteRequired && !note.trim() ? 'Tell us a little more' : null;

  const handleSubmit = () => {
    setTried(true);
    if (!reason || (noteRequired && !note.trim())) return;
    onSubmit({ reason, note: note.trim() || undefined });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Cancel your RSVP" scrollable>
      <View style={{ paddingBottom: keyboardHeight }}>
        <Text style={styles.intro}>Let the organiser know why you can’t make it to “{driveTitle}”.</Text>

        <View style={styles.chips}>
          {REASONS.map((r) => {
            const selected = reason === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                activeOpacity={0.8}
                onPress={() => setReason(r.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={styles.chipText}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {tried && !reason ? <Text style={styles.error}>Please choose a reason</Text> : null}

        <FormField
          required={noteRequired}
          label={noteRequired ? 'Details' : 'Anything to add? (optional)'}
          value={note}
          onChangeText={setNote}
          placeholder="Optional"
          maxLength={300}
          multiline
          style={styles.noteField}
        />
        {noteError ? <Text style={styles.error}>{noteError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedButton
          label={submitting ? 'Please wait…' : 'Cancel my RSVP'}
          onPress={handleSubmit}
          disabled={submitting}
          size="lg"
          fullWidth
          style={styles.submit}
        />
        <TouchableOpacity onPress={onClose} style={styles.keep} disabled={submitting}>
          <Text style={styles.keepText}>Keep my RSVP</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full ?? 999,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  chipSelected: { borderWidth: 2.5 },
  chipText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  noteField: { marginTop: 14 },
  error: { fontSize: 12, color: COLORS.coral, marginTop: 4 },
  submit: { marginTop: 16 },
  keep: { alignItems: 'center', paddingVertical: 12 },
  keepText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
});
