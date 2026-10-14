import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../common/AppText';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';

/** Shown in place of a profile's content once the viewer has blocked that account. */
export function BlockedProfileNotice({
  name,
  handle,
  avatarEmoji,
  avatarUrl,
  onUnblock,
  busy,
}: {
  name: string;
  handle?: string | null;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  onUnblock: () => void;
  busy?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarEmoji}>{avatarEmoji ?? '🧑‍🌾'}</Text>
        )}
      </View>
      <Text style={styles.name}>{name}</Text>
      {handle ? <Text style={styles.handle}>@{handle}</Text> : null}
      <View style={styles.pill}>
        <Text style={styles.pillText}>🚫 Blocked</Text>
      </View>
      <Text style={styles.body}>
        You have blocked {name}. You will not see each other's posts or stories on ARTH.
      </Text>
      <AnimatedButton
        label={busy ? 'Unblocking…' : 'Unblock'}
        onPress={onUnblock}
        disabled={busy}
        variant="ghost"
        fullWidth
        style={styles.btn}
        textStyle={styles.btnText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: COLORS.earth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: 0.7,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md, textAlign: 'center' },
  handle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  pill: {
    marginTop: SPACING.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
  body: { fontSize: 14, color: COLORS.textPrimary, textAlign: 'center', marginTop: SPACING.md, lineHeight: 20 },
  btn: { marginTop: SPACING.lg, borderWidth: 1.5, borderColor: COLORS.earth, borderRadius: RADIUS.lg },
  btnText: { color: COLORS.earthDark },
});
