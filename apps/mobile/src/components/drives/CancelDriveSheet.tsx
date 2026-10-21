import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { FormField } from '../common/FormField';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

interface Props {
  visible: boolean;
  driveTitle: string;
  confirmedCount: number;
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const MIN_LENGTH = 5;

/** The organiser must say why – it's shown to every RSVP'd volunteer in their notification. */
export function CancelDriveSheet({ visible, driveTitle, confirmedCount, submitting, error, onClose, onSubmit }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setReason('');
    setTried(false);
  }, [visible]);

  const trimmed = reason.trim();
  const reasonError = tried && trimmed.length < MIN_LENGTH ? 'Please tell volunteers why (at least a few words)' : null;

  const handleSubmit = () => {
    setTried(true);
    if (trimmed.length < MIN_LENGTH) return;
    onSubmit(trimmed);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Cancel this drive?" scrollable>
      <View style={{ paddingBottom: keyboardHeight }}>
        <Text style={styles.intro}>
          “{driveTitle}” will be cancelled and this can’t be undone.
          {confirmedCount > 0
            ? ` ${confirmedCount} volunteer${confirmedCount === 1 ? '' : 's'} will be notified right away with your reason, so please be kind and clear. 💚`
            : ''}
        </Text>

        <FormField
          required label="Reason for cancelling"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Heavy rain is forecast for that day"
          maxLength={300}
          multiline
        />
        {reasonError ? <Text style={styles.error}>{reasonError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedButton
          label={submitting ? 'Please wait…' : 'Cancel drive & notify volunteers'}
          onPress={handleSubmit}
          disabled={submitting}
          size="lg"
          fullWidth
          style={styles.submit}
        />
        <TouchableOpacity onPress={onClose} style={styles.keep} disabled={submitting}>
          <Text style={styles.keepText}>Keep the drive</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  error: { fontSize: 12, color: COLORS.coral, marginTop: 4 },
  submit: { marginTop: 16 },
  keep: { alignItems: 'center', paddingVertical: 12 },
  keepText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
});
