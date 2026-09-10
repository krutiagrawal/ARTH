import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';

/** The fields this tab actually renders — satisfied by both a full `ApiDrive` and the lighter
 * `featuredDrives` shape on an NGO's public profile, so either can be passed without adapting. */
export interface DriveListItem {
  id: string;
  title: string;
  photoUri?: string | null;
  city?: string | null;
  startsAt: string;
  confirmedCount?: number;
}

function DriveRow({ drive, onPress }: { drive: DriveListItem; onPress: () => void }) {
  const cover = resolveMediaUrl(drive.photoUri);
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={{ fontSize: 20 }}>🌳</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {drive.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {new Date(drive.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          {drive.city ? ` · ${drive.city}` : ''}
        </Text>
        {drive.confirmedCount !== undefined && <Text style={styles.confirmed}>{drive.confirmedCount} confirmed</Text>}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Role-parameterized: users/NGOs/groups all have a real notion of "their" drives (joined,
 * organized, or derived from members' RSVPs respectively). Nurseries don't run drives — there's
 * no schema relation to fabricate one from, so that role gets an honest empty state instead.
 */
export function DrivesTabContent({
  role,
  drives,
  onPressDrive,
}: {
  role: 'user' | 'ngo' | 'nursery' | 'group';
  drives: DriveListItem[];
  onPressDrive: (drive: DriveListItem) => void;
}) {
  if (role === 'nursery') {
    return (
      <EmptyState
        icon="🌱"
        title="No drives here"
        body="Nurseries don't run tree-planting drives – check Reservations for nursery activity instead."
      />
    );
  }

  if (drives.length === 0) {
    return (
      <EmptyState
        icon="🤝"
        title="No drives yet"
        body={
          role === 'ngo'
            ? "This NGO hasn't organized any drives yet."
            : role === 'group'
              ? 'No members have joined a drive yet.'
              : "You haven't joined a drive yet."
        }
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {drives.map((drive) => (
        <DriveRow key={drive.id} drive={drive} onPress={() => onPressDrive(drive)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, backgroundColor: COLORS.mintLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  confirmed: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
