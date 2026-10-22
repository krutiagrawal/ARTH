import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { AnimatedButton } from '../common/AnimatedButton';
import { DateTimeField } from '../common/DateTimeField';
import { COLORS } from '../../constants/colors';
import { ApiError } from '../../api/client';
import { useRelaunchDrive } from '../../hooks/useApiQueries';
import type { ApiDrive } from '../../api/drives';

interface Props {
  drive: ApiDrive | null;
  onClose: () => void;
  /** Called with the new, live drive once it has been created. */
  onRelaunched: (drive: ApiDrive) => void;
}

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

/**
 * Brings a cancelled drive back as a new upcoming one. The date is required (the old one has
 * usually passed); everything else is copied, and the volunteers who had signed up can be told.
 */
export function RelaunchDriveSheet({ drive, onClose, onRelaunched }: Props) {
  const relaunch = useRelaunchDrive();
  const [startsAt, setStartsAt] = useState(tomorrow);
  const [notifyPrevious, setNotifyPrevious] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!drive) return;
    setStartsAt(tomorrow());
    setNotifyPrevious(true);
    setError('');
  }, [drive?.id]);

  const previousCount = drive?.confirmedCount ?? 0;

  const submit = async () => {
    if (!drive) return;
    if (startsAt.getTime() <= Date.now()) {
      setError('Pick a start time in the future.');
      return;
    }
    setError('');
    try {
      const created = await relaunch.mutateAsync({ id: drive.id, startsAt: startsAt.toISOString(), notifyPrevious });
      onRelaunched(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not relaunch this drive. Please try again.');
    }
  };

  return (
    <Sheet visible={!!drive} onClose={onClose} title="Relaunch this drive?" scrollable>
      <View>
        <Text style={styles.intro}>
          “{drive?.title}” stays in your list as cancelled. A new drive with the same details is created for the date you pick — you can edit it afterwards.
        </Text>

        <DateTimeField required label="New start date & time" value={startsAt} onChange={setStartsAt} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Tell the earlier volunteers</Text>
            <Text style={styles.switchHint}>
              {previousCount > 0
                ? `${previousCount} volunteer${previousCount === 1 ? '' : 's'} had signed up. They get a notification that it's back on.`
                : 'Anyone who had signed up before it was cancelled gets a notification that it is back on.'}
            </Text>
          </View>
          <Switch value={notifyPrevious} onValueChange={setNotifyPrevious} trackColor={{ true: COLORS.sage }} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedButton
          label={relaunch.isPending ? 'Please wait…' : 'Relaunch drive'}
          onPress={submit}
          disabled={relaunch.isPending}
          size="lg"
          fullWidth
          style={styles.submit}
        />
        <TouchableOpacity onPress={onClose} style={styles.keep} disabled={relaunch.isPending}>
          <Text style={styles.keepText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  switchTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  switchHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  error: { fontSize: 12, color: COLORS.coral, marginTop: 8 },
  submit: { marginTop: 16 },
  keep: { alignItems: 'center', paddingVertical: 12 },
  keepText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
});
