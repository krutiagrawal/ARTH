import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useUnreadNotificationCount } from '../../hooks/useSocialQueries';

interface NotificationBellProps {
  onPress: () => void;
  /** Set on dark chrome (the admin console) so the glyph stays legible. */
  tint?: 'light' | 'dark';
}

/** Bell with an unread badge. Caps the display at 99+ so the pill can't stretch the header. */
export function NotificationBell({ onPress, tint = 'light' }: NotificationBellProps) {
  const { data } = useUnreadNotificationCount();
  const count = data?.count ?? 0;

  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.7} hitSlop={8}>
      <Text style={[styles.icon, tint === 'dark' && styles.iconDark]}>🔔</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  // Emoji ignore `color`, so the dark variant leans on opacity instead.
  iconDark: { opacity: 0.95 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900', lineHeight: 12 },
});
