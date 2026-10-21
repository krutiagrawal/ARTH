import React from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { FONTS, TEXT } from '../constants/typography';

import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusModal } from '../components/common/StatusModal';
import {
  useMyDrivesPaged,
  useNgoProfile,
  useDeleteDrive,
  useOwnedDriveSummary,
  useDuplicateDrive,
  useArchiveDrive,
} from '../hooks/useApiQueries';
import { BulkActionBar, SelectBox, AttentionBadge, useBulkSelection } from '../components/ngo/ManageListTools';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { OwnedDriveStatus } from '../api/drives';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { resolveMediaUrl } from '../api/client';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const DRIVE_STATUS_COLORS: Record<'upcoming' | 'cancelled' | 'completed' | 'ended', string> = {
  upcoming: COLORS.golden,
  ended: COLORS.sage,
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
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<OwnedDriveStatus | 'archived' | null>(null);
  const [sort, setSort] = React.useState<'newest' | 'oldest' | 'soonest'>('newest');
  const [when, setWhen] = React.useState<'next7' | 'next30' | 'past30' | null>(null);
  const q = useDebouncedValue(search.trim());
  // Date range chips resolve to ISO bounds when the filter changes, not on every render.
  const range = React.useMemo(() => {
    const day = 86_400_000;
    const now = Date.now();
    if (when === 'next7') return { from: new Date(now).toISOString(), to: new Date(now + 7 * day).toISOString() };
    if (when === 'next30') return { from: new Date(now).toISOString(), to: new Date(now + 30 * day).toISOString() };
    if (when === 'past30') return { from: new Date(now - 30 * day).toISOString(), to: new Date(now).toISOString() };
    return {};
  }, [when]);
  const listQuery = useMyDrivesPaged({
    q: q || undefined,
    status: view && view !== 'archived' ? view : undefined,
    archived: view === 'archived',
    sort,
    ...range,
  });
  const isFiltering = !!q || !!view || !!when;
  const summaryQuery = useOwnedDriveSummary();
  const duplicateMutation = useDuplicateDrive();
  const archiveMutation = useArchiveDrive();
  const bulk = useBulkSelection();
  const confirmAction = useConfirm();
  const summary = summaryQuery.data;
  const { data: drives = [], isLoading, refetch } = listQuery;
  const deleteMutation = useDeleteDrive();
  const confirmDelete = useConfirmDelete();
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchProfile, summaryQuery.refetch]);

  const bulkActions = [
    { label: view === 'archived' ? 'Unarchive' : 'Archive', run: (id: string) => archiveMutation.mutateAsync({ id, archived: view !== 'archived' }) },
    {
      label: 'Delete',
      danger: true,
      confirmText: 'These drives are permanently removed. Any with volunteers, sponsorships or linked trees will be skipped.',
      run: (id: string) => deleteMutation.mutateAsync(id),
    },
  ];

  const handleDuplicate = guard(async (id: string) => {
    try {
      const copy = await duplicateMutation.mutateAsync(id);
      navigation.navigate('NgoCreateDrive', { drive: copy });
    } catch (e) {
      confirmAction('Could not duplicate', e instanceof Error ? e.message : 'Please try again.');
    }
  });

  const handleArchive = guard(async (id: string, archived: boolean) => {
    try {
      await archiveMutation.mutateAsync({ id, archived });
    } catch (e) {
      confirmAction(archived ? 'Could not archive' : 'Could not unarchive', e instanceof Error ? e.message : 'Please try again.');
    }
  });

  return (
    <View style={styles.container}>
      <ListFilterBar
        query={search}
        onQueryChange={setSearch}
        placeholder="Search drives by title or place"
        options={[
          { key: null, label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'ended', label: 'Ended' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'archived', label: `Archived${summary?.archived ? ` (${summary.archived})` : ''}` },
        ]}
        value={view}
        onChange={setView}
        rows={[
          {
            label: 'Sort',
            options: [
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'soonest', label: 'Soonest first' },
            ],
            value: sort,
            onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'soonest'),
          },
          {
            label: 'When',
            options: [
              { key: null, label: 'Any time' },
              { key: 'next7', label: 'Next 7 days' },
              { key: 'next30', label: 'Next 30 days' },
              { key: 'past30', label: 'Past 30 days' },
            ],
            value: when,
            onChange: (k) => setWhen(k as 'next7' | 'next30' | 'past30' | null),
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance + (bulk.selected.size > 0 ? 90 : 0) }]}
        showsVerticalScrollIndicator={false}
        {...infiniteScrollProps(listQuery)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && drives.length === 0 && isFiltering && (
          <EmptyState icon="🔍" title="No drives match" body="Try a different search or filter." />
        )}
        {!isLoading && drives.length === 0 && !isFiltering && (
          <EmptyState icon="🤝" title="No drives yet" body="Publish your first planting drive to start collecting RSVPs." actionLabel="New drive" onAction={guard(() => navigation.navigate('NgoCreateDrive'))} />
        )}
        {drives.length > 0 && <Text style={styles.sectionTitle}>{view === 'archived' ? 'Archived Drives' : 'Drives'}</Text>}
        {drives.map((drive, i) => {
          const startsAt = new Date(drive.startsAt);
          const photoUrl = resolveMediaUrl(drive.photoUri);
          // The server leaves status as 'upcoming' until someone marks the drive complete, so a
          // drive past its date would still wear the Upcoming pill – show it as Ended instead.
          const displayStatus = drive.status === 'upcoming' && drive.hasEnded ? 'ended' : drive.status;
          const startsInDays = (startsAt.getTime() - Date.now()) / 86_400_000;
          const attention =
            drive.status === 'upcoming' && drive.hasEnded
              ? 'Ended – mark it completed'
              : drive.status === 'upcoming' && startsInDays > 0 && startsInDays <= 7 && drive.confirmedCount === 0
                ? 'No volunteers yet'
                : null;
          return (
            <FadeInRow key={drive.id} delay={i * 60}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => (bulk.selectMode ? bulk.toggle(drive.id) : navigation.navigate('DriveDetail', { driveId: drive.id }))}
                onLongPress={() => bulk.beginSelect(drive.id)}
              >
                {bulk.selectMode && <SelectBox selected={bulk.selected.has(drive.id)} />}
                <BorderCard style={styles.card} noPadding>
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
                          label={displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                          color={DRIVE_STATUS_COLORS[displayStatus]}
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

                      {attention && !drive.isArchived && <AttentionBadge text={attention} />}
                      <View style={styles.actionsRow}>
                        {drive.status === 'upcoming' && !drive.hasEnded && (
                          <TouchableOpacity onPress={guard(() => navigation.navigate('NgoCreateDrive', { drive }))}>
                            <Text style={styles.actionText}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDuplicate(drive.id)} disabled={duplicateMutation.isPending}>
                          <Text style={styles.actionText}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleArchive(drive.id, !drive.isArchived)}>
                          <Text style={styles.actionText}>{drive.isArchived ? 'Unarchive' : 'Archive'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={guard(() => confirmDelete('drive', drive.title, () => deleteMutation.mutateAsync(drive.id)))}>
                          <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
                        </TouchableOpacity>
                      </View>

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
                </BorderCard>
              </TouchableOpacity>
            </FadeInRow>
          );
        })}
        <PageFooter loading={listQuery.isFetchingNextPage} />
      </ScrollView>

      <BulkActionBar count={bulk.selected.size} actions={bulkActions} busy={bulk.busy} onAction={bulk.onAction} bottomOffset={bottomClearance} />

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  loader: { marginTop: 40 },
  sectionTitle: { ...TEXT.heading, color: COLORS.textPrimary, marginBottom: 12 },

  card: { marginBottom: 16, borderRadius: 20 },
  cardInner: { flexDirection: 'row', gap: 14, padding: 12 },
  // Tall portrait thumbnail down the left edge, matching the reference proportions – the old
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
  cardTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  metaIcon: { fontSize: 12 },
  metaText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  actionTextDanger: { color: COLORS.dangerDark },
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
