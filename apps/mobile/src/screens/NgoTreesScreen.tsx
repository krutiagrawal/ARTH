import React from 'react';
import { View, Image, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { IconBadge } from '../components/common/IconBadge';
import { StatusModal } from '../components/common/StatusModal';
import { useMyAdoptableTreesPaged, useNgoProfile, useRemoveAdoptableTree, useReleaseAdoption, useDeleteAdoptableTree, useRelistAdoptableTree, useOwnedTreeSummary, useDuplicateAdoptableTree, useArchiveAdoptableTree } from '../hooks/useApiQueries';
import { BulkActionBar, SelectBox, AttentionBadge, useBulkSelection } from '../components/ngo/ManageListTools';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { ListFilterBar } from '../components/common/ListFilterBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PageFooter } from '../components/common/PageFooter';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { resolveMediaUrl } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';
import type { ApiAdoptableTree } from '../api/adoptions';

import { TEXT } from '../constants/typography';
function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const TREE_STATUS_COLORS: Record<'available' | 'adopted' | 'removed', string> = {
  available: COLORS.sage,
  adopted: COLORS.golden,
  removed: COLORS.textMuted,
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

export function NgoTreesScreen({ navigation }: any) {
  const bottomClearance = useBottomNavClearance();
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'available' | 'adopted' | 'removed' | 'archived' | null>(null);
  const [sort, setSort] = React.useState<'newest' | 'oldest' | 'name'>('newest');
  const q = useDebouncedValue(search.trim());
  const listQuery = useMyAdoptableTreesPaged({
    q: q || undefined,
    status: view && view !== 'archived' ? view : undefined,
    archived: view === 'archived',
    sort,
  });
  const isFiltering = !!q || !!view;
  const summaryQuery = useOwnedTreeSummary();
  const duplicateMutation = useDuplicateAdoptableTree();
  const archiveMutation = useArchiveAdoptableTree();
  const bulk = useBulkSelection();
  const summary = summaryQuery.data;
  const { data: trees = [], isLoading, refetch } = listQuery;
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const { refreshing, onRefresh } = usePullToRefresh([refetch, summaryQuery.refetch]);
  const removeMutation = useRemoveAdoptableTree();
  const deleteMutation = useDeleteAdoptableTree();
  const relistMutation = useRelistAdoptableTree();
  const confirmDelete = useConfirmDelete();
  const releaseMutation = useReleaseAdoption();
  const confirm = useConfirm();

  const handleRemove = (tree: ApiAdoptableTree) => {
    const isAdopted = tree.status === 'adopted';
    confirm(
      'Remove this listing?',
      isAdopted
        ? `${tree.nickname} is currently adopted – removing it will end that adoption and notify the adopter.`
        : `${tree.nickname} will no longer be visible for adoption.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: guard(() => removeMutation.mutate(tree.id)) },
      ],
    );
  };

  const handleRelease = (tree: ApiAdoptableTree) => {
    confirm(
      'Release this adoption?',
      `${tree.nickname} will go back to being available for someone else to adopt.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Release', onPress: guard(() => releaseMutation.mutate(tree.id)) },
      ],
    );
  };

  const bulkActions = [
    view === 'archived'
      ? { label: 'Unarchive', run: (id: string) => archiveMutation.mutateAsync({ id, archived: false }) }
      : { label: 'Archive', run: (id: string) => archiveMutation.mutateAsync({ id, archived: true }) },
    {
      label: 'Remove listing',
      danger: true,
      confirmText: 'These trees are taken off the adoption list. Any current adopter is released and told.',
      run: (id: string) => removeMutation.mutateAsync(id),
    },
    { label: 'Relist', run: (id: string) => relistMutation.mutateAsync(id) },
    {
      label: 'Delete',
      danger: true,
      confirmText: 'These trees are permanently removed. Adopted ones, or ones with adoption or care history, will be skipped.',
      run: (id: string) => deleteMutation.mutateAsync(id),
    },
  ];

  const handleDuplicate = guard(async (id: string) => {
    try {
      const copy = await duplicateMutation.mutateAsync(id);
      navigation.navigate('NgoCreateAdoptableTree', { tree: copy });
    } catch (e) {
      confirm('Could not duplicate', e instanceof Error ? e.message : 'Please try again.');
    }
  });

  const handleArchive = guard(async (id: string, archived: boolean) => {
    try {
      await archiveMutation.mutateAsync({ id, archived });
    } catch (e) {
      confirm(archived ? 'Could not archive' : 'Could not unarchive', e instanceof Error ? e.message : 'Please try again.');
    }
  });

  return (
    <View style={styles.container}>
      <ListFilterBar
        query={search}
        onQueryChange={setSearch}
        placeholder="Search trees by name, species or place"
        options={[
          { key: null, label: 'All' },
          { key: 'available', label: 'Available' },
          { key: 'adopted', label: 'Adopted' },
          { key: 'removed', label: 'Removed' },
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
              { key: 'name', label: 'Name A–Z' },
            ],
            value: sort,
            onChange: (k) => setSort((k ?? 'newest') as 'newest' | 'oldest' | 'name'),
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
        {!isLoading && trees.length === 0 && isFiltering && (
          <EmptyState icon="🔍" title="No trees match" body="Try a different search or filter." />
        )}
        {!isLoading && trees.length === 0 && !isFiltering && (
          <EmptyState icon="🌳" title="No trees yet" body="List a tree for the community to adopt." actionLabel="New tree" onAction={guard(() => navigation.navigate('NgoCreateAdoptableTree'))} />
        )}
        {trees.map((tree, i) => (
          <FadeInRow key={tree.id} delay={i * 60}>
            <TouchableOpacity activeOpacity={1} onLongPress={() => bulk.beginSelect(tree.id)} onPress={bulk.selectMode ? () => bulk.toggle(tree.id) : undefined}>
            {bulk.selectMode && <SelectBox selected={bulk.selected.has(tree.id)} />}
            <BorderCard style={styles.card}>
              <View style={styles.cardRow}>
                {tree.photoUri ? (
                  <Image source={{ uri: resolveMediaUrl(tree.photoUri) }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <IconBadge icon="🌳" color={COLORS.forest} size={40} />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{tree.nickname}</Text>
                  <Text style={styles.cardSubtitle}>{tree.speciesName}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {[tree.location, tree.city].filter(Boolean).join(', ') || 'No location set'}
                    </Text>
                  </View>
                  <StatusPill
                    label={tree.status.charAt(0).toUpperCase() + tree.status.slice(1)}
                    color={TREE_STATUS_COLORS[tree.status]}
                  />
                  {tree.status === 'adopted' && tree.adopter && (
                    <View style={styles.adopterBox}>
                      <Text style={styles.adopterName}>
                        Adopted by {tree.adopter.name} (@{tree.adopter.handle})
                      </Text>
                      {tree.adopter.message ? <Text style={styles.adopterMessage}>“{tree.adopter.message}”</Text> : null}
                    </View>
                  )}
                  {tree.status === 'removed' && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={guard(() => relistMutation.mutate(tree.id))} disabled={relistMutation.isPending}>
                        <Text style={styles.actionText}>Relist</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleArchive(tree.id, !tree.isArchived)}>
                        <Text style={styles.actionText}>{tree.isArchived ? 'Unarchive' : 'Archive'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={guard(() => confirmDelete('tree', tree.nickname, () => deleteMutation.mutateAsync(tree.id)))}>
                        <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {tree.status !== 'removed' && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={guard(() => navigation.navigate('NgoCreateAdoptableTree', { tree }))}>
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      {tree.status === 'adopted' && (
                        <TouchableOpacity onPress={() => handleRelease(tree)}>
                          <Text style={styles.actionText}>Release</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDuplicate(tree.id)} disabled={duplicateMutation.isPending}>
                        <Text style={styles.actionText}>Duplicate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleArchive(tree.id, !tree.isArchived)}>
                        <Text style={styles.actionText}>{tree.isArchived ? 'Unarchive' : 'Archive'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemove(tree)}>
                        <Text style={[styles.actionText, styles.actionTextDanger]}>Remove listing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={guard(() => confirmDelete('tree', tree.nickname, () => deleteMutation.mutateAsync(tree.id)))}>
                        <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </BorderCard>
            </TouchableOpacity>
          </FadeInRow>
        ))}
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
  cardBody: { flex: 1 },
  cardTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  adopterBox: { marginTop: 8, backgroundColor: COLORS.beige, borderRadius: 10, padding: 8 },
  adopterName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  adopterMessage: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  actionTextDanger: { color: COLORS.dangerDark },
});
