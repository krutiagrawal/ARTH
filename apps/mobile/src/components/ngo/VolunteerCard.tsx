import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import type { ApiVolunteer } from '../../api/ngo';

const call = (phone: string) => Linking.openURL(`tel:+91${phone}`).catch(() => {});
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fullDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function Avatar({ v, size }: { v: ApiVolunteer; size: number }) {
  const uri = resolveMediaUrl(v.avatarUrl);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? <Image source={{ uri }} style={styles.avatarImg} /> : <Text style={{ fontSize: size * 0.5 }}>{v.avatarEmoji}</Text>}
    </View>
  );
}

/**
 * One line-pair per person so hundreds of volunteers stay scannable: who they are on the left, the
 * next drive they're signed up for and a call button on the right. Everything else is in the
 * details sheet this row opens.
 */
export function VolunteerRow({ volunteer: v, onPress }: { volunteer: ApiVolunteer; onPress: () => void }) {
  const next = v.upcoming[0];
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${v.name}, open details`}>
      <Avatar v={v} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{v.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          @{v.handle}
          {v.city ? `  ·  ${v.city}` : ''}
        </Text>
      </View>
      {next ? (
        <View style={styles.nextPill}>
          <Text style={styles.nextPillText} numberOfLines={1}>
            🗓 {dayMonth(next.startsAt)}
            {v.upcomingCount > 1 ? `  +${v.upcomingCount - 1}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.noNext}>No RSVP</Text>
      )}
      {v.phone ? (
        <TouchableOpacity style={styles.callBtn} onPress={() => call(v.phone!)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Call ${v.name}`}>
          <Text style={styles.callIcon}>📞</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.callSpacer} />
      )}
    </TouchableOpacity>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A calendar-page tile: the month on a coloured strip, the day below. */
function DateTile({ iso, past }: { iso: string; past?: boolean }) {
  const d = new Date(iso);
  return (
    <View style={styles.tile}>
      <View style={[styles.tileTop, { backgroundColor: past ? COLORS.textMuted : COLORS.golden }]}>
        <Text style={styles.tileMonth}>{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
      </View>
      <Text style={styles.tileDay}>{d.getDate()}</Text>
    </View>
  );
}

function DriveLine({ title, iso, sub, past, onPress }: { title: string; iso: string; sub: string; past?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.driveLine} onPress={onPress} activeOpacity={0.75}>
      <DateTile iso={iso} past={past} />
      <View style={{ flex: 1 }}>
        <Text style={styles.driveTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.driveSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/** Full detail for one volunteer - the content of the bottom sheet a roster row opens. */
export function VolunteerDetails({
  volunteer: v,
  onOpenProfile,
  onOpenDrive,
  onRemove,
}: {
  volunteer: ApiVolunteer;
  onOpenProfile: () => void;
  onOpenDrive: (driveId: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.detailHeader}>
        <Avatar v={v} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName} numberOfLines={1}>{v.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            @{v.handle}
            {v.city ? `  ·  ${v.city}` : ''}
          </Text>
          <Text style={styles.sub}>Level {v.level} · {v.treesPlanted} tree{v.treesPlanted === 1 ? '' : 's'} planted</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {v.phone ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => call(v.phone!)} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>📞  Call +91 {v.phone}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.primaryBtn, styles.disabledBtn]}>
            <Text style={styles.disabledBtnText}>No phone on file</Text>
          </View>
        )}
        <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenProfile} activeOpacity={0.8}>
          <Text style={styles.secondaryBtnText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Stat value={v.rsvpCount} label="RSVPs" />
        <View style={styles.statDivider} />
        <Stat value={v.drivesAttended} label="Attended" />
        <View style={styles.statDivider} />
        <Stat value={v.noShows} label="Missed" />
        <View style={styles.statDivider} />
        <Stat value={v.hoursLogged > 0 ? v.hoursLogged : '–'} label="Hours" />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>RSVP'd for{v.upcomingCount > 3 ? ` (next 3 of ${v.upcomingCount})` : ''}</Text>
        {v.upcoming.length > 0 ? (
          v.upcoming.map((d) => (
            <DriveLine key={d.driveId} title={d.title} iso={d.startsAt} sub={[timeOf(d.startsAt), d.city].filter(Boolean).join('  ·  ')} onPress={() => onOpenDrive(d.driveId)} />
          ))
        ) : (
          <Text style={styles.empty}>Not signed up for anything upcoming</Text>
        )}
      </View>

      {v.recent.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionLabel}>Past drives</Text>
          {v.recent.map((d) => (
            <DriveLine
              key={d.driveId}
              past
              title={d.title}
              iso={d.startsAt}
              sub={d.cancelled ? 'Cancelled' : d.attended === true ? '✓ Attended' : d.attended === false ? 'Did not attend' : 'Attendance not marked'}
              onPress={() => onOpenDrive(d.driveId)}
            />
          ))}
        </View>
      )}

      {v.emergencyContactName && v.emergencyContactPhone ? (
        <TouchableOpacity style={styles.emergency} onPress={() => call(v.emergencyContactPhone!)} activeOpacity={0.75}>
          <Text style={{ fontSize: 20 }}>🆘</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyLabel}>Emergency contact</Text>
            <Text style={styles.emergencyValue}>{v.emergencyContactName} · +91 {v.emergencyContactPhone}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {(v.roles.length > 0 || v.volunteeringSince) && (
        <Text style={styles.sub}>
          {v.volunteeringSince ? `With you since ${fullDate(v.volunteeringSince)}` : ''}
          {v.roles.length > 0 ? `  ·  ${v.roles.join(', ')}` : ''}
        </Text>
      )}

      <TouchableOpacity onPress={onRemove} style={styles.removeButton} activeOpacity={0.7}>
        <Text style={styles.removeText}>Remove from upcoming drives</Text>
      </TouchableOpacity>
    </View>
  );
}

const border = 'rgba(139, 107, 71, 0.22)';

const styles = StyleSheet.create({
  avatar: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.sage, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  nextPill: { backgroundColor: 'rgba(212,168,83,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, maxWidth: 110 },
  nextPillText: { fontSize: 11, fontWeight: '700', color: COLORS.earth },
  noNext: { fontSize: 11, color: COLORS.textMuted },
  callBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.forest, alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 15 },
  callSpacer: { width: 34 },

  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailName: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: COLORS.forest, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  disabledBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: border },
  disabledBtnText: { fontSize: 13, color: COLORS.textMuted },
  secondaryBtn: { borderRadius: 999, paddingVertical: 11, paddingHorizontal: 20, borderWidth: 1.5, borderColor: COLORS.forest, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.forest },

  statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, borderColor: border, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: border },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  empty: { fontSize: 13, color: COLORS.textMuted },
  driveLine: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: border, padding: 10 },
  tile: { width: 44, borderRadius: 10, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: border },
  tileTop: { width: '100%', alignItems: 'center', paddingVertical: 2 },
  tileMonth: { fontSize: 9, fontWeight: '800', color: COLORS.white, letterSpacing: 0.6 },
  tileDay: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, paddingVertical: 2 },
  driveTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  driveSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: COLORS.textMuted },

  emergency: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(224,90,71,0.08)', borderRadius: RADIUS.lg, padding: 12 },
  emergencyLabel: { fontSize: 10, fontWeight: '800', color: COLORS.coral, textTransform: 'uppercase', letterSpacing: 0.6 },
  emergencyValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  removeButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  removeText: { fontSize: 12, color: COLORS.danger, fontWeight: '700' },
});
