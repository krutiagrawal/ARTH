import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { resolveMediaUrl } from '../api/client';
import { useDeletePortfolioEntry, useMyPortfolio } from '../hooks/useSocialQueries';
import type { ApiPortfolioEntry } from '../api/portfolio';
import { useConfirm } from '../context/ConfirmDialogContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ApiPortfolioEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cover = resolveMediaUrl(entry.media[0]?.url);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onEdit}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Text style={styles.coverEmptyIcon}>🌱</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.date}>{formatDate(entry.happenedOn)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>
        {entry.locationLabel || entry.city ? (
          <Text style={styles.location} numberOfLines={1}>
            📍 {[entry.locationLabel, entry.city].filter(Boolean).join(', ')}
          </Text>
        ) : null}

        <View style={styles.statRow}>
          {entry.treesPlanted != null && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{entry.treesPlanted.toLocaleString()}</Text>
              <Text style={styles.statLabel}>trees</Text>
            </View>
          )}
          {entry.volunteersInvolved != null && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{entry.volunteersInvolved.toLocaleString()}</Text>
              <Text style={styles.statLabel}>volunteers</Text>
            </View>
          )}
          {entry.media.length > 1 && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{entry.media.length}</Text>
              <Text style={styles.statLabel}>photos</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={6}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={6}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * "Past work" — drives and projects an NGO ran before joining the platform.
 *
 * Deliberately separate from Manage → Drives: nothing here can be RSVP'd to or attended, and its
 * numbers are self-reported rather than backed by tree health checks.
 */
export function NgoPortfolioScreen({ navigation }: any) {
  const { data: entries = [], isLoading, refetch, isRefetching } = useMyPortfolio();
  const deleteEntry = useDeletePortfolioEntry();
  const confirm = useConfirm();

  const confirmDelete = (entry: ApiPortfolioEntry) => {
    confirm('Delete this entry?', `“${entry.title}” will be removed from your profile.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry.mutate(entry.id) },
    ]);
  };

  const totalTrees = entries.reduce((sum, e) => sum + (e.treesPlanted ?? 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Past work" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text style={styles.introText}>
                Show what you did before joining PLANT. These appear on your public profile, kept
                separate from live drives and from your tracked survival numbers.
              </Text>
              {entries.length > 0 && (
                <Text style={styles.introTotal}>
                  {totalTrees.toLocaleString()} trees across {entries.length}{' '}
                  {entries.length === 1 ? 'project' : 'projects'}
                </Text>
              )}
              <AnimatedButton
                label="+ Add past work"
                onPress={() => navigation.navigate('NgoPortfolioEntry', {})}
                size="sm"
                gradientColors={[COLORS.forest, COLORS.forestDeep]}
                style={styles.addBtn}
              />
            </View>
          }
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              onEdit={() => navigation.navigate('NgoPortfolioEntry', { entry: item })}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📚"
              title="No past work added yet"
              body="Add the drives and projects you ran before joining – photos, dates and the impact you had."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.md },
  intro: { gap: 10, marginBottom: 4 },
  introText: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  introTotal: { fontFamily: FONTS.display, fontSize: 17, lineHeight: 23, color: COLORS.forest },
  addBtn: { alignSelf: 'flex-start' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 150, backgroundColor: COLORS.mintLight },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  coverEmptyIcon: { fontSize: 34, opacity: 0.5 },
  cardBody: { padding: 14, gap: 4 },
  date: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  title: { fontFamily: FONTS.displayBold, fontSize: 19, lineHeight: 25, color: COLORS.textPrimary },
  location: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 18, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  cardActions: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  editLink: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  deleteLink: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
});
