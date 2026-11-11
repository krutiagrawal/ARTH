import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import { GROUP_TYPES, type ApiGroup, type ApiPerson, type GroupType } from '../../api/plantingGroups';

export const groupTypeEmoji = (type: GroupType) => GROUP_TYPES.find((t) => t.key === type)?.emoji ?? '🌳';
export const groupTypeLabel = (type: GroupType) => GROUP_TYPES.find((t) => t.key === type)?.label ?? 'Group';

export const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;

export function GroupAvatar({ group, size = 48 }: { group: Pick<ApiGroup, 'logoUrl' | 'groupType'>; size?: number }) {
  const uri = resolveMediaUrl(group.logoUrl);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.beigeLight }} />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.5 }}>{groupTypeEmoji(group.groupType)}</Text>
    </View>
  );
}

export function PersonAvatar({ person, size = 40 }: { person: Pick<ApiPerson, 'avatarEmoji' | 'avatarUrl'>; size?: number }) {
  const uri = resolveMediaUrl(person.avatarUrl);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.beigeLight }} />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.5 }}>{person.avatarEmoji || '🧑'}</Text>
    </View>
  );
}

/** A person row: avatar, name, @handle, and anything the screen wants on the right. */
export function PersonRow({
  person,
  subtitle,
  right,
  onPress,
}: {
  person: ApiPerson;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <PersonAvatar person={person} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle ?? `@${person.handle}`}
        </Text>
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

/** A row for a group in a list: logo, name, type and city, member count. */
export function GroupRow({ group, right, onPress }: { group: ApiGroup; right?: React.ReactNode; onPress?: () => void }) {
  const meta = [groupTypeLabel(group.groupType), group.city, `${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'}`].filter(Boolean).join(' · ');
  const body = (
    <View style={styles.row}>
      <GroupAvatar group={group} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

export function StatTile({ value, label, emoji }: { value: string | number; label: string; emoji: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function RolePill({ role }: { role: 'admin' | 'member' }) {
  return (
    <View style={[styles.pill, role === 'admin' && styles.pillAdmin]}>
      <Text style={[styles.pillText, role === 'admin' && styles.pillTextAdmin]}>{role === 'admin' ? 'Admin' : 'Member'}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
    </View>
  );
}

/** One line of the group timeline, worded from the activity type. */
export function describeActivity(a: { type: string; data: Record<string, any> | null; actor: { name: string } | null }): { emoji: string; text: string } {
  const who = a.actor?.name ?? 'Someone';
  switch (a.type) {
    case 'member_joined':
      return { emoji: '👋', text: `${who} joined the group` };
    case 'member_left':
      return { emoji: '🚪', text: `${who} left the group` };
    case 'tree_planted':
      return { emoji: '🌱', text: `${who} planted ${a.data?.nickname ? `“${a.data.nickname}”` : 'a tree'} for the group` };
    case 'tree_adopted':
      return { emoji: '🤝', text: `${who} adopted ${a.data?.nickname ? `“${a.data.nickname}”` : 'a tree'} for the group` };
    case 'donation_made':
      return { emoji: '💚', text: `${who} donated ${typeof a.data?.amountCents === 'number' ? rupees(a.data.amountCents) : ''} for the group`.replace('  ', ' ') };
    case 'challenge_created':
      return { emoji: '🏆', text: `${who} started the challenge “${a.data?.title ?? ''}”` };
    case 'role_changed':
      return { emoji: '🛡️', text: `${who} changed a member's role` };
    default:
      return { emoji: '📌', text: 'Group update' };
  }
}

const styles = StyleSheet.create({
  avatarFallback: { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  tileEmoji: { fontSize: 20 },
  tileValue: { fontSize: 20, fontWeight: '800', color: COLORS.forest, marginTop: 2 },
  tileLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.earth, letterSpacing: 1, textTransform: 'uppercase' },
  sectionAction: { fontSize: 13, fontWeight: '700', color: COLORS.sageDark },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  pillAdmin: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  pillText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  pillTextAdmin: { color: COLORS.white },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.warmBrown, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.sage },
});
