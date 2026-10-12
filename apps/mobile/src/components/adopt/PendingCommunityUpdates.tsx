import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { resolveMediaUrl } from '../../api/client';
import { STATUS_META } from '../../constants/treeHealth';
import { useAdoptionStatus, useReviewTreeUpdate } from '../../hooks/useApiQueries';

/**
 * Updates other people sent about an adopted tree, waiting for the adopter's decision. Accepting
 * adds one to the tree's timeline (labelled as a community update); declining discards it.
 * Neither changes the tree's status. The status endpoint only returns these to the adopter.
 */
export function PendingCommunityUpdates({ adoptableTreeId }: { adoptableTreeId: string }) {
  const { data } = useAdoptionStatus(adoptableTreeId);
  const review = useReviewTreeUpdate();
  const updates = data?.pendingUpdates ?? [];
  if (updates.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>📬 Updates awaiting your decision</Text>
      {updates.map((u) => (
        <View key={u.id} style={styles.card}>
          {u.photoUrl ? <Image source={{ uri: resolveMediaUrl(u.photoUrl) }} style={styles.photo} /> : null}
          <Text style={styles.from}>
            From {u.observer ? `${u.observer.name} (@${u.observer.handle})` : 'a visitor'} · {new Date(u.at).toLocaleDateString()}
          </Text>
          {u.note ? <Text style={styles.note}>{u.note}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { borderColor: STATUS_META.healthy.color }]}
              disabled={review.isPending}
              onPress={() => review.mutate({ observationId: u.id, decision: 'accept' })}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: STATUS_META.healthy.color }]}>✓ Add to timeline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { borderColor: COLORS.dangerDark }]}
              disabled={review.isPending}
              onPress={() => review.mutate({ observationId: u.id, decision: 'reject' })}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: COLORS.dangerDark }]}>✕ Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  heading: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  card: { borderWidth: 1.5, borderColor: COLORS.warmBrown, borderRadius: 14, padding: 10, marginBottom: 8 },
  photo: { width: '100%', height: 130, borderRadius: 10, marginBottom: 8 },
  from: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  note: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  button: { flex: 1, height: 36, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 12, fontWeight: '800' },
});
