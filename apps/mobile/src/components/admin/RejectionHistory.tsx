import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

interface RejectionHistoryProps {
  status: string;
  count?: number;
  history?: { reason: string | null; rejectedAt: string }[];
}

/** Admin view of how many times an NGO/nursery application was rejected before, and why each time. */
export function RejectionHistory({ status, count, history }: RejectionHistoryProps) {
  if (!count) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>
        {status === 'rejected' ? 'Rejected' : 'Previously rejected'} {count} time{count === 1 ? '' : 's'}
      </Text>
      {(history ?? []).map((h, i) => (
        <Text key={i} style={styles.entry}>
          {new Date(h.rejectedAt).toLocaleDateString()} – {h.reason ? `“${h.reason}”` : 'No reason given'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, gap: 6, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.danger },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
  entry: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
});
