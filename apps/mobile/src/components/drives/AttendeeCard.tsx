import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import type { ApiDriveAttendee } from '../../api/drives';

interface Props {
  attendee: ApiDriveAttendee;
  /** NGO-provided transport – shows where this volunteer boards. */
  showBoarding: boolean;
  /** Completed drive: show the "showed up" checkbox. */
  checkable: boolean;
  disabled?: boolean;
  onToggleAttended: () => void;
}

const call = (phone: string) => Linking.openURL(`tel:+91${phone}`).catch(() => {});

function boardingLabel(a: ApiDriveAttendee): string {
  if (a.pickupPoint) return a.pickupPoint.address;
  // RSVPs made before the confirm form existed have no phone either, so no choice was recorded.
  return a.phone ? 'Coming by themselves' : 'Pickup not recorded';
}

/**
 * One volunteer, kept calm: name + a single status chip up front, with phone and boarding as
 * tappable chips and the secondary details (emergency contact, note) tucked behind a tap.
 */
export function AttendeeCard({ attendee: a, showBoarding, checkable, disabled, onToggleAttended }: Props) {
  const [open, setOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const hasMore = !!(a.emergencyContactName || a.note);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {checkable && (
          <TouchableOpacity
            style={[styles.checkbox, a.attended && styles.checkboxChecked]}
            onPress={onToggleAttended}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!a.attended }}
          >
            {a.attended && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        )}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{a.name.trim().charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
          <Text style={styles.handle} numberOfLines={1}>@{a.handle}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(a.rsvpedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <View style={styles.chips}>
        {a.phone ? (
          <TouchableOpacity style={styles.chip} onPress={() => call(a.phone!)} activeOpacity={0.7}>
            <Text style={styles.chipText}>📞 +91 {a.phone}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.chip}>
            <Text style={styles.chipMutedText}>📞 No phone</Text>
          </View>
        )}
        {showBoarding &&
          (a.pickupPoint ? (
            // Tap to toggle between the one-line preview and the whole address.
            <TouchableOpacity
              style={[styles.chip]}
              onPress={() => setAddressOpen((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={addressOpen ? 'Collapse pickup address' : 'Show full pickup address'}
            >
              <Text style={styles.chipText} numberOfLines={addressOpen ? undefined : 1}>
                🚌 {a.pickupPoint.address}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.chip]}>
              <Text style={styles.chipMutedText}>🚌 {boardingLabel(a)}</Text>
            </View>
          ))}
      </View>

      {hasMore && (
        <>
          <TouchableOpacity onPress={() => setOpen((v) => !v)} style={styles.moreToggle} activeOpacity={0.7}>
            <Text style={styles.moreText}>{open ? 'Hide details ▴' : 'Emergency contact & note ▾'}</Text>
          </TouchableOpacity>
          {open && (
            <View style={styles.more}>
              {a.emergencyContactName && a.emergencyContactPhone ? (
                <TouchableOpacity onPress={() => call(a.emergencyContactPhone!)} activeOpacity={0.7}>
                  <Text style={styles.moreLabel}>Emergency contact</Text>
                  <Text style={styles.moreValue}>
                    🆘 {a.emergencyContactName} · +91 {a.emergencyContactPhone}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {a.note ? (
                <View style={styles.noteBlock}>
                  <Text style={styles.moreLabel}>Note</Text>
                  <Text style={styles.moreValue}>{a.note}</Text>
                </View>
              ) : null}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  checkmark: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.sageLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: COLORS.forest },
  nameCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  handle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  date: { fontSize: 11, color: COLORS.textSecondary },
  chips: { gap: 4, marginTop: 10 },
  chip: { paddingVertical: 2 },
  chipText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  chipMutedText: { fontSize: 12, color: COLORS.textSecondary },
  moreToggle: { marginTop: 10 },
  moreText: { fontSize: 12, color: COLORS.forest, fontWeight: '600' },
  more: { marginTop: 8, gap: 8 },
  noteBlock: {},
  moreLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  moreValue: { fontSize: 13, color: COLORS.textPrimary, marginTop: 2 },
});
