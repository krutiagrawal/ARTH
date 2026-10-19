import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { hexToRgba } from '../../utils/color';
import { useResubmitNgoProfile } from '../../hooks/useApiQueries';

type NgoStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface NgoStatusBannerProps {
  status?: NgoStatus;
  rejectionReason?: string | null;
  onEditProfile: () => void;
  /** Text colours for the page surface the banner sits on (theme-aware – the seam below the hero). */
  textColors: { primary: string; secondary: string };
  /** True when that surface is light, so accents need their darker tone to stay readable. */
  onLightSurface: boolean;
}

const SUPPORT_URL = 'mailto:support@plantapp.example?subject=ARTH%20NGO%20account%20suspended';

// `light` = accent on a light page surface (daytime themes), `dark` = on a dark one (night).
const META: Record<Exclude<NgoStatus, 'approved'>, { emoji: string; title: string; body: string; light: string; dark: string }> = {
  pending: {
    emoji: '🕓',
    title: 'Your application is under review',
    body: "You can look around the app, but you can't take any actions until an admin approves it.",
    light: '#8A5A00',
    dark: COLORS.amberLight,
  },
  rejected: {
    emoji: '⚠️',
    title: 'Your application was not approved',
    body: "You can look around, but can't take any actions. Update your profile and resubmit it for review.",
    light: COLORS.dangerDark,
    dark: COLORS.dangerLight,
  },
  suspended: {
    emoji: '⛔',
    title: 'Your account is suspended',
    body: "You can look around, but can't take any actions while suspended.",
    light: COLORS.dangerDark,
    dark: COLORS.dangerLight,
  },
};

/** Persistent notice on the NGO dashboard until an admin approves the account (read-only until then). */
export function NgoStatusBanner({ status, rejectionReason, onEditProfile, textColors, onLightSurface }: NgoStatusBannerProps) {
  const resubmit = useResubmitNgoProfile();
  if (!status || status === 'approved') return null;
  const meta = META[status];
  const accent = onLightSurface ? meta.light : meta.dark;
  return (
    <View style={[styles.card, { backgroundColor: hexToRgba(accent, 0.12), borderColor: hexToRgba(accent, 0.5) }]}>
      <Text style={styles.emoji}>{meta.emoji}</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: accent }]}>{meta.title}</Text>
        <Text style={[styles.body, { color: textColors.secondary }]}>{meta.body}</Text>
        {status === 'rejected' && rejectionReason ? <Text style={[styles.reason, { color: textColors.primary }]}>Reason: {rejectionReason}</Text> : null}
        {status === 'rejected' ? (
          <View style={styles.actions}>
            <TouchableOpacity onPress={onEditProfile}>
              <Text style={[styles.action, { color: accent }]}>Edit profile →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => resubmit.mutate()} disabled={resubmit.isPending}>
              {resubmit.isPending ? (
                <ActivityIndicator color={accent} />
              ) : (
                <Text style={[styles.action, { color: accent }]}>Resubmit for review →</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        {status === 'suspended' ? (
          <TouchableOpacity onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}>
            <Text style={[styles.action, { color: accent }]}>Email support →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  emoji: { fontSize: 22 },
  textWrap: { flex: 1, gap: 2 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  body: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },
  reason: { fontFamily: FONTS.bodyMedium, fontSize: 13, lineHeight: 19, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  action: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginTop: 6 },
});
