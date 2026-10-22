import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Share, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../common/AppText';
import { BorderCard } from '../common/BorderCard';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import { fetchDriveForecast } from '../../api/weather';
import type { ApiDrive } from '../../api/drives';

const EFFORT_LABEL = { easy: 'Easy going', moderate: 'Moderate effort', strenuous: 'Physically demanding' } as const;

// A drive with no stated length is treated as running this long when deciding "happening now".
const DEFAULT_DURATION_MIN = 180;

function timeUntil(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** Where this drive stands right now, in one line - shown before anything else so a volunteer never
 * has to infer it from a missing button. */
export function DriveStatusBanner({ drive }: { drive: ApiDrive }) {
  const now = Date.now();
  const start = new Date(drive.startsAt).getTime();
  const end = start + (drive.durationMinutes ?? DEFAULT_DURATION_MIN) * 60_000;
  const isFull = drive.capacity != null && drive.confirmedCount >= drive.capacity;

  let tone: 'good' | 'warn' | 'bad' | 'neutral' = 'neutral';
  let text: string;
  if (drive.status === 'cancelled') {
    tone = 'bad';
    text = drive.cancelReason ? `Cancelled — ${drive.cancelReason}` : 'This drive was cancelled';
  } else if (drive.status === 'completed') {
    text = 'Completed';
  } else if (drive.hasEnded) {
    text = 'This drive has ended';
  } else if (now >= start && now <= end) {
    tone = 'good';
    text = 'Happening now';
  } else if (isFull) {
    tone = 'warn';
    text = drive.isRsvped ? "You're in — this drive is now full" : 'Full — all spots are taken';
  } else {
    tone = 'good';
    text = `Open for RSVP · starts in ${timeUntil(start - now)}`;
  }

  const palette = {
    good: { bg: 'rgba(46,158,79,0.12)', fg: COLORS.forest },
    warn: { bg: 'rgba(212,168,83,0.18)', fg: COLORS.earth },
    bad: { bg: 'rgba(224,90,71,0.12)', fg: COLORS.dangerDark },
    neutral: { bg: 'rgba(139,107,71,0.12)', fg: COLORS.textSecondary },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      <Text style={[styles.bannerText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

/** "12 going · 18 spots left", with a few avatars (no names) so it feels like other people. */
export function DriveGoingRow({ drive }: { drive: ApiDrive }) {
  const left = drive.capacity != null ? Math.max(drive.capacity - drive.confirmedCount, 0) : null;
  const preview = drive.goingPreview ?? [];
  const extra = Math.max(drive.confirmedCount - preview.length, 0);

  return (
    <View style={styles.goingRow}>
      <Text style={styles.icon}>👥</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoText}>
          {drive.confirmedCount} going
          {left != null ? (left === 0 ? ' · no spots left' : ` · ${left} spot${left === 1 ? '' : 's'} left`) : ' · open to everyone'}
        </Text>
        {preview.length > 0 && (
          <View style={styles.avatarRow}>
            {preview.map((u, i) => {
              const uri = resolveMediaUrl(u.avatarUrl);
              return (
                <View key={i} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
                  {uri ? <Image source={{ uri }} style={styles.avatarImg} /> : <Text style={styles.avatarEmoji}>{u.avatarEmoji}</Text>}
                </View>
              );
            })}
            {extra > 0 && <Text style={styles.moreText}>+{extra} more</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

/** Age / effort expectations, so nobody turns up to a physically demanding drive by surprise. */
export function DriveRequirementsRow({ drive }: { drive: ApiDrive }) {
  const parts = [
    drive.minAge ? `Ages ${drive.minAge}+` : null,
    drive.effortLevel ? EFFORT_LABEL[drive.effortLevel] : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <View style={styles.goingRow}>
      <Text style={styles.icon}>🙋</Text>
      <Text style={[styles.infoText, { flex: 1 }]}>{parts.join(' · ')}</Text>
    </View>
  );
}

/** Forecast for the drive's start. Quietly renders nothing when it is further out than the forecast
 * reaches, already past, or the weather service is unavailable. */
export function DriveForecastRow({ drive }: { drive: ApiDrive }) {
  const live = drive.status === 'upcoming' && !drive.hasEnded && drive.lat != null && drive.lng != null;
  const { data } = useQuery({
    queryKey: ['drive-forecast', drive.id, drive.startsAt],
    queryFn: () => fetchDriveForecast(drive.lat as number, drive.lng as number, drive.startsAt),
    enabled: live,
    staleTime: 30 * 60_000,
  });
  if (!live || !data?.available) return null;
  return (
    <View style={styles.goingRow}>
      <Text style={styles.icon}>🌦️</Text>
      <Text style={[styles.infoText, { flex: 1 }]}>
        Forecast: {data.temperatureCelsius}°C, {data.description}
        {data.rainChance != null && data.rainChance >= 20 ? ` · ${data.rainChance}% chance of rain` : ''}
      </Text>
    </View>
  );
}

/** What to bring / what the NGO provides / who to call on the day. */
export function DriveVolunteerInfo({ drive }: { drive: ApiDrive }) {
  const hasContact = !!(drive.contactName || drive.contactPhone);
  if (!drive.whatToBring && !drive.providedByNgo && !hasContact) return null;
  return (
    <>
      {(drive.whatToBring || drive.providedByNgo) && (
        <BorderCard style={styles.card}>
          {drive.whatToBring ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>🎒 What to bring</Text>
              <Text style={styles.blockText}>{drive.whatToBring}</Text>
            </View>
          ) : null}
          {drive.providedByNgo ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>🧰 Provided by {drive.ngoName}</Text>
              <Text style={styles.blockText}>{drive.providedByNgo}</Text>
            </View>
          ) : null}
        </BorderCard>
      )}
      {hasContact && (
        <BorderCard style={styles.card}>
          <Text style={styles.blockLabel}>📞 Contact on the day</Text>
          {drive.contactName ? <Text style={styles.blockText}>{drive.contactName}</Text> : null}
          {drive.contactPhone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${drive.contactPhone!.replace(/[^0-9+]/g, '')}`)} accessibilityRole="link">
              <Text style={styles.phone}>{drive.contactPhone}</Text>
            </TouchableOpacity>
          ) : null}
        </BorderCard>
      )}
    </>
  );
}

function calendarStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Add to calendar (a Google Calendar event link - works without any calendar permission) and share. */
export function DriveActionsRow({ drive }: { drive: ApiDrive }) {
  if (drive.status === 'cancelled') return null;
  const start = new Date(drive.startsAt);
  const end = new Date(start.getTime() + (drive.durationMinutes ?? 120) * 60_000);
  const place = [drive.address, drive.city].filter(Boolean).join(', ');
  const canCalendar = drive.status === 'upcoming' && !drive.hasEnded;

  const addToCalendar = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: drive.title,
      dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
      details: `${drive.description}\n\nHosted by ${drive.ngoName} on ARTH`,
      location: place,
    });
    Linking.openURL(`https://calendar.google.com/calendar/render?${params.toString()}`);
  };

  const share = () => {
    const when = start.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    Share.share({
      message: `Join me for "${drive.title}" by ${drive.ngoName} — ${when}${place ? `, ${place}` : ''}. Find it on ARTH 🌳`,
    }).catch(() => undefined);
  };

  return (
    <View style={styles.actionsRow}>
      {canCalendar && (
        <TouchableOpacity style={styles.actionBtn} onPress={addToCalendar} accessibilityRole="button">
          <Text style={styles.actionText}>📅 Add to calendar</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.actionBtn} onPress={share} accessibilityRole="button">
        <Text style={styles.actionText}>↗ Share</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  bannerText: { fontSize: 13, fontWeight: '700' },
  goingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  icon: { fontSize: 14 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.beigeLight,
    borderWidth: 2,
    borderColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarOverlap: { marginLeft: -8 },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 13 },
  moreText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  card: { marginBottom: 12, gap: 10 },
  block: { gap: 2 },
  blockLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  blockText: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  phone: { fontSize: 14, fontWeight: '700', color: COLORS.forest, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
  },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
});
