import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';

/** The fields this tab renders - satisfied by a full `ApiDrive` (NGO profile) and by the lighter
 * shapes the user/group profiles pass, so everything past the first few fields is optional and the
 * row only shows what it has. */
export interface DriveListItem {
  id: string;
  title: string;
  photoUri?: string | null;
  city?: string | null;
  startsAt: string;
  confirmedCount?: number;
  description?: string | null;
  address?: string | null;
  durationMinutes?: number | null;
  capacity?: number | null;
  status?: 'upcoming' | 'cancelled' | 'completed';
  hasEnded?: boolean;
  cancelReason?: string | null;
  transportMode?: 'self_arrange' | 'ngo_provided';
  isRsvped?: boolean;
  relaunchedToId?: string | null;
}

type DisplayStatus = 'upcoming' | 'ended' | 'completed' | 'cancelled';

const STATUS_STYLE: Record<DisplayStatus, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: COLORS.golden },
  ended: { label: 'Ended', color: COLORS.sage },
  completed: { label: 'Completed', color: COLORS.forest },
  cancelled: { label: 'Cancelled', color: COLORS.coral },
};

function displayStatus(drive: DriveListItem): DisplayStatus | null {
  if (!drive.status) return null;
  return drive.status === 'upcoming' && drive.hasEnded ? 'ended' : drive.status;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
}

function DriveRow({ drive, onPress }: { drive: DriveListItem; onPress: () => void }) {
  const cover = resolveMediaUrl(drive.photoUri);
  const status = displayStatus(drive);
  const statusStyle = status ? STATUS_STYLE[status] : null;
  const date = new Date(drive.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const meta = [date, drive.city].filter(Boolean).join(' · ');

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
        <Text style={styles.title} numberOfLines={2}>
          {drive.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {statusStyle ? (
        <View style={[styles.pill, { backgroundColor: `${statusStyle.color}26` }]}>
          <Text style={[styles.pillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * Role-parameterized: users/NGOs/groups all have a real notion of "their" drives (joined,
 * organized, or derived from members' RSVPs respectively). Nurseries don't run drives – there's
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
        body="Nurseries don't run tree-planting drives – browse their saplings instead."
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
  },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.mintLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
});
