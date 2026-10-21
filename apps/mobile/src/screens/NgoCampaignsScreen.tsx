import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { IconBadge } from '../components/common/IconBadge';
import { StatusModal } from '../components/common/StatusModal';
import {
  useMyCampaigns,
  useCloseCampaign,
  useReopenCampaign,
  useDeleteCampaign,
  useNgoProfile,
  useOwnedCampaignSummary,
  useDuplicateCampaign,
  useArchiveCampaign,
} from '../hooks/useApiQueries';
import { BulkActionBar, SelectBox, AttentionBadge, useBulkSelection } from '../components/ngo/ManageListTools';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { CAMPAIGN_CATEGORIES, type ApiCampaign, type CampaignCategory } from '../api/donations';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { resolveMediaUrl } from '../api/client';

import { TEXT } from '../constants/typography';
function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const CAMPAIGN_STATUS_COLORS: Record<'active' | 'closed', string> = {
  active: COLORS.sage,
  closed: COLORS.textMuted,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Runs 30 days · 12 left" / "Ended" / "No end date", from the campaign's creation and end dates. */
function runsForText(c: ApiCampaign): string {
  if (!c.endsAt) return 'No end date';
  const end = new Date(c.endsAt).getTime();
  const total = Math.max(1, Math.round((end - new Date(c.createdAt).getTime()) / DAY_MS));
  const left = Math.ceil((end - Date.now()) / DAY_MS);
  if (left <= 0) return `Ran ${total} days · ended`;
  return `Runs ${total} days · ${left} ${left === 1 ? 'day' : 'days'} left`;
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

export function NgoCampaignsScreen({ navigation }: any) {
  const bottomClearance = useBottomNavClearance();
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'active' | 'closed' | 'archived' | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<CampaignCategory | null>(null);
  const [sort, setSort] = React.useState<'newest' | 'oldest' | 'ending_soon' | 'goal'>('newest');
  const q = useDebouncedValue(search.trim());
  const listQuery = useMyCampaigns({
    q: q || undefined,
    status: view && view !== 'archived' ? view : undefined,
    archived: view === 'archived',
    category: categoryFilter ?? undefined,
    sort,
  });
  const isFiltering = !!q || !!view || !!categoryFilter;
  const summaryQuery = useOwnedCampaignSummary();
  const duplicateMutation = useDuplicateCampaign();
  const archiveMutation = useArchiveCampaign();
  const bulk = useBulkSelection();
  const confirmAction = useConfirm();
  const summary = summaryQuery.data;
  const { data: campaigns = [], isLoading, refetch } = listQuery;
  const closeMutation = useCloseCampaign();
  const reopenMutation = useReopenCampaign();
  const deleteMutation = useDeleteCampaign();
  const confirmDelete = useConfirmDelete();
  const { data: profile, refetch: refetchProfile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchProfile, summaryQuery.refetch]);

  const bulkActions = [
    view === 'archived'
      ? { label: 'Unarchive', run: (id: string) => archiveMutation.mutateAsync({ id, archived: false }) }
      : { label: 'Archive', run: (id: string) => archiveMutation.mutateAsync({ id, archived: true }) },
    { label: 'Close', run: (id: string) => closeMutation.mutateAsync(id) },
    { label: 'Reopen', run: (id: string) => reopenMutation.mutateAsync(id) },
    {
      label: 'Delete',
      danger: true,
      confirmText: 'These campaigns are permanently removed. Any that have received donations will be skipped.',
      run: (id: string) => deleteMutation.mutateAsync(id),
    },
  ];

  const handleDuplicate = guard(async (id: string) => {
    try {
      const copy = await duplicateMutation.mutateAsync(id);
      navigation.navigate('NgoCreateCampaign', { campaign: copy });
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
        placeholder="Search campaigns by title or description"
        options={[
          { key: null, label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'closed', label: 'Closed' },
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
              { key: 'ending_soon', label: 'Ending soon' },
              { key: 'goal', label: 'Biggest goal' },
            ],
            value: sort,
            onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'ending_soon' | 'goal'),
          },
          {
            label: 'Category',
            options: [{ key: null, label: 'Any' }, ...CAMPAIGN_CATEGORIES.map((c) => ({ key: c.key as string, label: `${c.emoji} ${c.label}` }))],
            value: categoryFilter,
            onChange: (k) => setCategoryFilter(k as CampaignCategory | null),
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
        {!isLoading && campaigns.length === 0 && isFiltering && (
          <EmptyState icon="🔍" title="No campaigns match" body="Try a different search or filter." />
        )}
        {!isLoading && campaigns.length === 0 && !isFiltering && (
          <EmptyState icon="💚" title="No campaigns yet" body="Start a donation campaign to fund your next drive." actionLabel="New campaign" onAction={guard(() => navigation.navigate('NgoCreateCampaign'))} />
        )}
        {campaigns.map((c, i) => {
          const progress = c.goalAmountCents ? Math.min(1, c.raisedAmountCents / c.goalAmountCents) : null;
          const daysLeft = c.endsAt ? Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / DAY_MS) : null;
          const attention =
            c.status === 'active' && daysLeft != null && daysLeft > 0 && daysLeft <= 3
              ? `Ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
              : c.status === 'active' && progress != null && progress >= 1
                ? 'Goal reached – close it?'
                : null;
          return (
            <FadeInRow key={c.id} delay={i * 60}>
              <TouchableOpacity activeOpacity={1} onLongPress={() => bulk.beginSelect(c.id)} onPress={bulk.selectMode ? () => bulk.toggle(c.id) : undefined}>
              {bulk.selectMode && <SelectBox selected={bulk.selected.has(c.id)} />}
              <BorderCard style={styles.card}>
                <View style={styles.cardRow}>
                  {c.coverPhotoUri ? (
                    <Image source={{ uri: resolveMediaUrl(c.coverPhotoUri) }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <IconBadge icon="💚" color={COLORS.golden} size={40} />
                  )}
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <StatusPill
                        label={c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        color={CAMPAIGN_STATUS_COLORS[c.status]}
                      />
                    </View>
                    <Text style={styles.cardBody} numberOfLines={2}>{c.description}</Text>
                    <View style={styles.infoRow}>
                      {c.category && (
                        <View style={styles.infoChip}>
                          <Text style={styles.infoChipText}>
                            {CAMPAIGN_CATEGORIES.find((cat) => cat.key === c.category)?.emoji}{' '}
                            {CAMPAIGN_CATEGORIES.find((cat) => cat.key === c.category)?.label}
                          </Text>
                        </View>
                      )}
                      <View style={styles.infoChip}>
                        <Text style={styles.infoChipText}>⏳ {runsForText(c)}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        ₹{(c.raisedAmountCents / 100).toLocaleString()}
                        {c.goalAmountCents ? ` / ₹${(c.goalAmountCents / 100).toLocaleString()}` : ' raised'}
                      </Text>
                    </View>
                    {progress != null && (
                      <View style={styles.progressTrack}>
                        <LinearGradient
                          colors={[COLORS.sageLight, COLORS.forest]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${progress * 100}%` }]}
                        />
                      </View>
                    )}
                    {attention && !c.isArchived && <AttentionBadge text={attention} />}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={guard(() => navigation.navigate('NgoCreateCampaign', { campaign: c }))}>
                        <Text style={styles.toggleText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={guard(() => (c.status === 'active' ? closeMutation.mutate(c.id) : reopenMutation.mutate(c.id)))}
                      >
                        <Text style={styles.toggleText}>{c.status === 'active' ? 'Close campaign' : 'Reopen campaign'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDuplicate(c.id)} disabled={duplicateMutation.isPending}>
                        <Text style={styles.toggleText}>Duplicate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleArchive(c.id, !c.isArchived)}>
                        <Text style={styles.toggleText}>{c.isArchived ? 'Unarchive' : 'Archive'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={guard(() => confirmDelete('campaign', c.title, () => deleteMutation.mutateAsync(c.id)))}>
                        <Text style={[styles.toggleText, styles.deleteText]}>Delete</Text>
                      </TouchableOpacity>
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
  card: { marginBottom: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.beige },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary, flexShrink: 1 },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.beige, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  infoChip: { backgroundColor: COLORS.beige, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  infoChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  deleteText: { color: COLORS.dangerDark },
  toggleText: { fontSize: 12, color: COLORS.forest, fontWeight: '700' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
