import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { resolveMediaUrl } from '../../api/client';
import { STATUS_META } from '../../constants/treeHealth';
import type { PassportTimelineEntry } from '../../api/trees';
import type { TreeHealthStatus } from '../../api/plantedTrees';

const ROLE_LABEL = { owner: 'Adopter', ngo: 'NGO', community: 'Community' } as const;

function whoLabel(entry: PassportTimelineEntry): string {
  if (entry.source === 'health_check') return 'NGO health check';
  if (entry.archived) return `Previous ${entry.observerRole === 'community' ? 'community update' : 'adopter'}`;
  if (entry.observerRole) {
    const base = ROLE_LABEL[entry.observerRole];
    return entry.observerRole === 'community' && entry.observer ? `${base} · @${entry.observer.handle}` : base;
  }
  return '';
}

/**
 * Most recent status updates for an adopted tree, newest first, each labelled with who posted it:
 * the adopter, the NGO, or a community member whose update the adopter approved.
 */
export function TreeUpdatesTimeline({ timeline, limit = 5 }: { timeline: PassportTimelineEntry[]; limit?: number }) {
  const entries = timeline.filter((e) => e.source === 'health_check' || e.source === 'observation').slice(0, limit);
  if (entries.length === 0) {
    return <Text style={styles.empty}>No status updates yet.</Text>;
  }

  return (
    <View>
      {entries.map((e) => {
        const meta = e.status ? STATUS_META[e.status as TreeHealthStatus] : undefined;
        return (
          <View key={e.id} style={[styles.row, { borderLeftColor: meta?.color ?? COLORS.warmBrown }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.status}>{meta ? `${meta.emoji} ${meta.label}` : 'Update'}</Text>
              <Text style={styles.who}>{whoLabel(e)}</Text>
              {e.note ? <Text style={styles.note}>{e.note}</Text> : null}
              {e.photoUrl ? <Image source={{ uri: resolveMediaUrl(e.photoUrl) }} style={styles.photo} /> : null}
            </View>
            <Text style={styles.date}>{new Date(e.at).toLocaleDateString()}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: COLORS.textSecondary },
  row: { flexDirection: 'row', gap: 10, borderLeftWidth: 3, paddingLeft: 10, marginBottom: 12 },
  status: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  who: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  note: { fontSize: 13, color: COLORS.textPrimary, marginTop: 4 },
  photo: { width: 90, height: 90, borderRadius: 10, marginTop: 6 },
  date: { fontSize: 11, color: COLORS.textMuted },
});
