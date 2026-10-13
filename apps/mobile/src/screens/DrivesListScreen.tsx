import React, { useMemo, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyLocation } from '../hooks/useMyLocation';
import { useDrives } from '../hooks/useApiQueries';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { resolveMediaUrl } from '../api/client';
import type { ApiDrive } from '../api/drives';

import { TEXT } from '../constants/typography';

type FilterKey = 'all' | 'upcoming' | 'past' | 'cancelled' | 'near' | 'mine';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'near', label: 'Near me' },
  { key: 'mine', label: 'My bookings' },
];

// Ended drives stay listed for their details, but are locked (no RSVP) and sink below live ones.
const isEnded = (d: ApiDrive) => d.status === 'completed' || !!d.hasEnded;
const isCancelled = (d: ApiDrive) => d.status === 'cancelled';
const isLive = (d: ApiDrive) => !isCancelled(d) && !isEnded(d);
const isPast = (d: ApiDrive) => !isCancelled(d) && isEnded(d);

export function DrivesListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { selection } = useHaptics();
  const queryClient = useQueryClient();
  const { coords } = useMyLocation();
  const { data: drives = [], isLoading, refetch } = useDrives(coords?.lat, coords?.lng, true, undefined, true);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [filter, setFilter] = useState<FilterKey>('all');

  // Live drives first (soonest first), then past ones, then cancelled ones (most recent first).
  const sorted = useMemo(() => {
    const live = drives.filter(isLive).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const past = drives.filter(isPast).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    const cancelled = drives.filter(isCancelled).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
    return [...live, ...past, ...cancelled];
  }, [drives]);

  const counts = useMemo(() => {
    return {
      all: drives.length,
      upcoming: drives.filter(isLive).length,
      past: drives.filter(isPast).length,
      cancelled: drives.filter(isCancelled).length,
      near: drives.filter((d) => d.distanceKm != null && isLive(d)).length,
      mine: drives.filter((d) => d.isRsvped).length,
    };
  }, [drives]);

  const summary = useMemo(() => {
    const live = drives.filter(isLive);
    return {
      upcoming: live.length,
      going: live.reduce((n, d) => n + (d.confirmedCount ?? 0), 0),
      open: live.reduce((n, d) => n + (d.capacity != null ? Math.max(0, d.capacity - d.confirmedCount) : 0), 0),
    };
  }, [drives]);

  const visible = useMemo(() => {
    if (filter === 'upcoming') return sorted.filter(isLive);
    if (filter === 'past') return sorted.filter(isPast);
    if (filter === 'cancelled') return sorted.filter(isCancelled);
    if (filter === 'mine') return sorted.filter((d) => d.isRsvped);
    if (filter === 'near') {
      return sorted.filter((d) => d.distanceKm != null && isLive(d)).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
    return sorted;
  }, [sorted, filter]);

  const emptyBody =
    filter === 'mine'
      ? "You haven't reserved a place on any drive yet."
      : filter === 'past'
        ? 'No past drives to show yet.'
      : filter === 'cancelled'
        ? 'No cancelled drives.'
      : filter === 'near'
        ? coords
          ? 'No drives with a known location near you right now.'
          : 'Turn on location access to see drives near you.'
        : 'Check back soon – NGOs add new planting drives regularly.';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>NGO Drives</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <Text style={styles.intro}>
          Verified drives run by partner NGOs – a morning, a patch of earth, and a few dozen hands. Reserve your place.
        </Text>

        {drives.length > 0 && (
          <BorderCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.upcoming}</Text>
                <Text style={styles.summaryLabel}>Upcoming</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.going}</Text>
                <Text style={styles.summaryLabel}>Going</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: COLORS.sageDark }]}>{summary.open}</Text>
                <Text style={styles.summaryLabel}>Spots open</Text>
              </View>
            </View>
          </BorderCard>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => {
                  selection();
                  setFilter(f.key);
                }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label} <Text style={[styles.chipCount, active && styles.chipTextActive]}>{counts[f.key]}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && visible.length === 0 && (
          <EmptyState
            icon="🤝"
            title={drives.length === 0 ? 'No drives nearby yet' : 'Nothing here just yet'}
            body={emptyBody}
            actionLabel={filter !== 'all' && drives.length > 0 ? 'See all drives' : undefined}
            onAction={() => setFilter('all')}
          />
        )}
        {visible.map((drive) => {
          const cancelled = drive.status === 'cancelled';
          const ended = isEnded(drive);
          const starts = new Date(drive.startsAt);
          const hasCapacity = !ended && drive.capacity != null && drive.capacity > 0;
          const spotsLeft = hasCapacity ? Math.max(0, (drive.capacity as number) - drive.confirmedCount) : null;
          const filled = hasCapacity ? Math.min(100, Math.round((drive.confirmedCount / (drive.capacity as number)) * 100)) : 0;
          const full = hasCapacity && spotsLeft === 0;
          const nearlyFull = hasCapacity && !full && filled >= 80;
          const cover = resolveMediaUrl(drive.photoUri);
          const dimmed = cancelled || ended;
          const secondaryCta = dimmed || (full && !drive.isRsvped);

          let badge: { text: string; tone: 'good' | 'warn' | 'bad' | 'muted' } | null = null;
          if (cancelled) badge = { text: 'Cancelled', tone: 'bad' };
          else if (ended) badge = { text: drive.isRsvped ? 'You joined' : 'Ended', tone: 'muted' };
          else if (drive.isRsvped) badge = { text: 'Going', tone: 'good' };
          else if (full) badge = { text: 'Full', tone: 'muted' };
          else if (nearlyFull) badge = { text: `${spotsLeft} spots left`, tone: 'warn' };

          const ctaLabel = drive.isRsvped && !dimmed ? 'View your booking' : secondaryCta ? 'View details' : 'Reserve a place';

          return (
            <TouchableOpacity
              key={drive.id}
              activeOpacity={0.85}
              onPress={() => {
                selection();
                // Same shape `getDrive` returns (both share `driveInclude`), so the detail screen
                // paints instantly instead of re-fetching data this list screen already has.
                queryClient.setQueryData(['drives', drive.id], drive);
                navigation.navigate('DriveDetail', { driveId: drive.id });
              }}
            >
              <BorderCard style={[styles.card, dimmed && styles.cardDimmed]}>
                <View style={styles.thumbWrap}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Text style={{ fontSize: 32 }}>🌳</Text>
                    </View>
                  )}
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateMonth}>{starts.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
                    <Text style={styles.dateDay}>{starts.getDate()}</Text>
                  </View>
                  {badge && (
                    <View
                      style={[
                        styles.statusBadge,
                        badge.tone === 'good' && { backgroundColor: COLORS.sage },
                        badge.tone === 'warn' && { backgroundColor: '#D98E04' },
                        badge.tone === 'bad' && { backgroundColor: '#C0392B' },
                        badge.tone === 'muted' && { backgroundColor: 'rgba(0,0,0,0.55)' },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{badge.text}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>{drive.title}</Text>
                <Text style={styles.cardSubtitle}>{drive.ngoName}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText} numberOfLines={1}>
                    📍 {[drive.address, drive.city].filter(Boolean).join(', ') || 'Location TBD'}
                    {drive.distanceKm != null ? ` · ${drive.distanceKm.toFixed(0)} km` : ''}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    🕒 {starts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                  <Text style={styles.metaText}>
                    👥 {drive.confirmedCount}
                    {drive.capacity != null && !ended ? `/${drive.capacity}` : ''} {ended ? 'joined' : 'going'}
                  </Text>
                </View>

                {hasCapacity && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(filled, 3)}%` }]} />
                  </View>
                )}

                <View style={[styles.cta, secondaryCta && styles.ctaSecondary]}>
                  <Text style={[styles.ctaText, secondaryCta && styles.ctaTextSecondary]}>{ctaLabel} →</Text>
                </View>
              </BorderCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  intro: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, marginBottom: 16 },
  summaryCard: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: `${COLORS.textSecondary}33` },
  filterScroll: { marginBottom: 16, marginHorizontal: -20, flexGrow: 0 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, borderColor: `${COLORS.textSecondary}44`, justifyContent: 'center' },
  chipActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  chipText: { fontSize: 13, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.cream },
  chipCount: { fontSize: 12, color: COLORS.textSecondary },
  card: { marginBottom: 12 },
  cardDimmed: { opacity: 0.7 },
  thumbWrap: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: '100%', height: 140 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: `${COLORS.sage}22` },
  dateBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  dateMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: COLORS.textSecondary },
  dateDay: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  statusBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: `${COLORS.textSecondary}22`, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.sage },
  cta: { marginTop: 14, height: 42, borderRadius: 999, backgroundColor: COLORS.sage, alignItems: 'center', justifyContent: 'center' },
  ctaSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: `${COLORS.textSecondary}55` },
  ctaText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  ctaTextSecondary: { color: COLORS.textPrimary },
});
