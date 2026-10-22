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
  volunteerName: string;
  /** How many upcoming drives will lose this RSVP. */
  upcomingCount: number;
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const MIN_LENGTH = 5;

/** The organiser must say why - the volunteer sees it in the notification telling them they were removed. */
export function RemoveVolunteerSheet({ visible, volunteerName, upcomingCount, submitting, error, onClose, onSubmit }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setReason('');
    setTried(false);
  }, [visible]);

  const trimmed = reason.trim();
  const reasonError = tried && trimmed.length < MIN_LENGTH ? 'Please give a reason (at least a few words)' : null;

  const handleSubmit = () => {
    setTried(true);
    if (trimmed.length < MIN_LENGTH) return;
    onSubmit(trimmed);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Remove this volunteer?" scrollable>
      <View style={{ paddingBottom: keyboardHeight }}>
        <Text style={styles.intro}>
          {upcomingCount > 0
            ? `${volunteerName}'s RSVP to ${upcomingCount === 1 ? 'your upcoming drive' : `your ${upcomingCount} upcoming drives`} will be cancelled and they'll be notified with your reason.`
            : `${volunteerName} isn't signed up for any upcoming drive, so nothing will change for them.`}{' '}
          Past attendance is kept.
        </Text>

        <FormField
          required
          label="Reason for removing"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Repeatedly missed drives without telling us"
          maxLength={300}
          multiline
        />
        {reasonError ? <Text style={styles.error}>{reasonError}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedButton
          label={submitting ? 'Please wait…' : 'Remove & notify volunteer'}
          onPress={handleSubmit}
          disabled={submitting}
          size="lg"
          fullWidth
          style={styles.submit}
        />
        <TouchableOpacity onPress={onClose} style={styles.keep} disabled={submitting}>
          <Text style={styles.keepText}>Keep volunteer</Text>
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
