import React from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';

import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyDrives } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { resolveMediaUrl } from '../api/client';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const DRIVE_STATUS_COLORS: Record<'upcoming' | 'cancelled' | 'completed', string> = {
  upcoming: COLORS.golden,
  completed: COLORS.forest,
  cancelled: COLORS.coral,
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}26` }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

function MetaRow({ icon, text, style }: { icon: string; text: string; style?: any }) {
  return (
    <View style={[styles.metaRow, style]}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export function NgoDrivesScreen({ navigation }: any) {
  const bottomClearance = useBottomNavClearance();
  const { data: drives = [], isLoading } = useMyDrives();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && drives.length === 0 && (
          <EmptyState icon="🤝" title="No drives yet" body="Publish your first planting drive to start collecting RSVPs." actionLabel="New drive" onAction={() => navigation.navigate('NgoCreateDrive')} />
        )}
        {drives.length > 0 && <Text style={styles.sectionTitle}>Upcoming Drives</Text>}
        {drives.map((drive, i) => {
          const startsAt = new Date(drive.startsAt);
          const photoUrl = resolveMediaUrl(drive.photoUri);
          return (
            <FadeInRow key={drive.id} delay={i * 60}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('DriveDetail', { driveId: drive.id })}
              >
                <GlassCard variant="warm" style={styles.card} noPadding>
                  <View style={styles.cardInner}>
                    {/* The API returns a host-relative `/uploads/...` path; `resolveMediaUrl`
                        turns it into something <Image> can actually fetch. Without it the
                        thumbnail silently rendered nothing at all. */}
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Text style={styles.thumbIcon}>🌱</Text>
                      </View>
                    )}

                    <View style={styles.cardBody}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{drive.title}</Text>
                        <StatusPill
                          label={drive.status.charAt(0).toUpperCase() + drive.status.slice(1)}
                          color={DRIVE_STATUS_COLORS[drive.status]}
                        />
                      </View>

                      <MetaRow
                        icon="📍"
                        text={[drive.address, drive.city].filter(Boolean).join(', ') || 'No address set'}
                      />
                      <MetaRow
                        icon="📅"
                        text={`${startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}  ·  ${startsAt.toLocaleDateString(undefined, { weekday: 'short' })}`}
                      />

                      <View style={styles.footerRow}>
                        <MetaRow
                          icon="👥"
                          style={styles.footerMeta}
                          text={`${drive.confirmedCount}${drive.capacity != null ? ` / ${drive.capacity}` : ''} going`}
                        />
                        <View style={styles.arrowButton}>
                          <Text style={styles.arrowIcon}>→</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </FadeInRow>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  loader: { marginTop: 40 },
  sectionTitle: { fontFamily: FONTS.display, fontSize: 17, lineHeight: 23, color: COLORS.textPrimary, marginBottom: 12 },

  card: { marginBottom: 16, borderRadius: 20 },
  cardInner: { flexDirection: 'row', gap: 14, padding: 12 },
  // Tall portrait thumbnail down the left edge, matching the reference proportions — the old
  // 68x68 square left the card looking half-empty next to four rows of text.
  thumb: { width: 84, height: 168, borderRadius: 14 },
  thumbPlaceholder: {
    backgroundColor: COLORS.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 30, opacity: 0.5 },

  cardBody: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontFamily: FONTS.display, fontSize: 18, lineHeight: 24, color: COLORS.textPrimary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  metaIcon: { fontSize: 12 },
  metaText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  footerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  // Takes the leftover width so the count doesn't get squeezed to nothing by the arrow button.
  footerMeta: { flex: 1 },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: { fontSize: 17, color: COLORS.textPrimary, fontWeight: '700' },

  statusPill: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});
