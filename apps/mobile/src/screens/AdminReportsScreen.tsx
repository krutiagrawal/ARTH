import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { Sheet } from '../components/common/Sheet';
import { EmptyState } from '../components/common/EmptyState';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { resolveMediaUrl } from '../api/client';
import { useActOnReport, useAdminReports } from '../hooks/useSocialQueries';
import type { ApiAdminReport, ModerationAction, ReportStatus, ReportTargetTypeFilter } from '../api/admin';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';

const FILTERS: { key: ReportStatus | undefined; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: undefined, label: 'All' },
];

// 'accounts' is a shorthand the backend expands to targetType in (user, ngo,
// nursery, corporate) — default tab, since account reports are what admin
// needs to see first/on priority.
const TARGET_TABS: { key: ReportTargetTypeFilter; label: string }[] = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'post', label: 'Posts' },
  { key: 'story', label: 'Stories' },
];

const ACCOUNT_ICON: Record<string, string> = { user: '👤', ngo: '🏢', nursery: '🌱', corporate: '🏬' };

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate: 'Hate speech',
  misinformation: 'False info',
  nudity: 'Nudity',
  violence: 'Violence',
  other: 'Other',
};

function ReportRow({ report, onAct }: { report: ApiAdminReport; onAct: (a: ModerationAction) => void }) {
  const thumb = resolveMediaUrl(report.post?.thumbnailUrl);
  const isOpen = report.status === 'open';
  const account = report.account;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {account ? (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyIcon}>{ACCOUNT_ICON[account.role] ?? '👤'}</Text>
          </View>
        ) : thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyIcon}>{report.post ? '📝' : '🗑️'}</Text>
          </View>
        )}

        <View style={styles.cardText}>
          <View style={styles.badgeRow}>
            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{REASON_LABELS[report.reason] ?? report.reason}</Text>
            </View>
            <Text style={styles.targetType}>{report.targetType.replace('_', ' ')}</Text>
            {account?.isBlocked && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenText}>BLOCKED</Text>
              </View>
            )}
            {report.post?.isHidden && (
              <View style={styles.hiddenBadge}>
                <Text style={styles.hiddenText}>HIDDEN</Text>
              </View>
            )}
          </View>

          {account ? (
            <>
              <Text style={styles.caption} numberOfLines={1}>{account.name}</Text>
              <Text style={styles.author} numberOfLines={1}>@{account.handle} · {account.role}</Text>
            </>
          ) : (
            <Text style={styles.caption} numberOfLines={2}>
              {report.post
                ? report.post.caption || '(no caption)'
                : 'The reported content no longer exists.'}
            </Text>
          )}

          {report.post?.authorName ? (
            <Text style={styles.author} numberOfLines={1}>
              by {report.post.authorName}
            </Text>
          ) : null}

          <Text style={styles.meta} numberOfLines={1}>
            Reported by {report.reporter?.name ?? 'someone'} ·{' '}
            {new Date(report.createdAt).toLocaleDateString()}
          </Text>

          {report.details ? <Text style={styles.details}>“{report.details}”</Text> : null}
        </View>
      </View>

      {isOpen ? (
        <View style={styles.actions}>
          {account ? (
            <>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => onAct('dismiss')} activeOpacity={0.8}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
              {!account.isBlocked && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onAct('block_account')} activeOpacity={0.8}>
                  <Text style={styles.deleteText}>Block</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => onAct('dismiss')} activeOpacity={0.8}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
              {report.post?.isHidden ? (
                <TouchableOpacity style={styles.unhideBtn} onPress={() => onAct('unhide')} activeOpacity={0.8}>
                  <Text style={styles.unhideText}>Unhide</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.hideBtn} onPress={() => onAct('hide')} activeOpacity={0.8}>
                  <Text style={styles.hideText}>Hide</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onAct('delete')} activeOpacity={0.8}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <Text style={styles.resolved}>
          {report.status === 'dismissed' ? 'Dismissed' : 'Actioned'}
          {report.reviewedBy ? ` by ${report.reviewedBy.name}` : ''}
          {report.reviewedAt ? ` · ${new Date(report.reviewedAt).toLocaleDateString()}` : ''}
        </Text>
      )}
    </View>
  );
}

/**
 * Admin moderation queue.
 *
 * Every action asks for an optional reason before it commits — that reason lands in the audit log
 * and in the notification sent back to the reporter, so "why was this taken down" is answerable
 * later.
 */
export function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useBottomNavClearance();
  const [filter, setFilter] = useState<ReportStatus | undefined>('open');
  const [targetTab, setTargetTab] = useState<ReportTargetTypeFilter>('accounts');
  const [pending, setPending] = useState<{ report: ApiAdminReport; action: ModerationAction } | null>(null);
  const [reason, setReason] = useState('');
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  const { data, isLoading, refetch, isRefetching } = useAdminReports(filter, targetTab);
  const act = useActOnReport();

  const confirm = () => {
    if (!pending) return;
    act.mutate(
      { id: pending.report.id, action: pending.action, reason: reason.trim() || undefined },
      {
        onSettled: () => {
          setPending(null);
          setReason('');
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Reported content</Text>
        <Text style={styles.subtitle}>
          {data?.accountOpenCount ?? 0} open account report{data?.accountOpenCount === 1 ? '' : 's'} · posts auto-hide after 3 reports
        </Text>
      </View>

      <View style={styles.filterRow}>
        {TARGET_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.chip, targetTab === t.key && styles.chipActive]}
            onPress={() => setTargetTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, targetTab === t.key && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.mint} />
        </View>
      ) : (
        <FlatList
          data={data?.reports ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <ReportRow report={item} onAct={(action) => setPending({ report: item, action })} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="✅"
              tint="dark"
              title={filter === 'open' ? 'Nothing to review' : 'Nothing here'}
              body={
                filter === 'open'
                  ? 'No open reports. The community is behaving itself.'
                  : 'No reports with this status yet.'
              }
            />
          }
        />
      )}

      <Sheet
        visible={pending !== null}
        onClose={() => {
          setPending(null);
          setReason('');
        }}
        title={
          pending?.action === 'block_account'
            ? 'Block this account?'
            : pending?.action === 'dismiss'
              ? 'Dismiss this report?'
              : pending?.action === 'delete'
                ? 'Delete this content?'
                : pending?.action === 'unhide'
                  ? 'Make this visible again?'
                  : 'Hide this content?'
        }
      >
        <Text style={[styles.sheetBody, isNightMode && styles.sheetBodyNight]}>
          {pending?.action === 'block_account'
            ? 'They immediately lose access on web and mobile — every signed-in request will be rejected until unblocked.'
            : pending?.action === 'delete'
              ? 'This removes the content permanently for everyone. It cannot be undone.'
              : pending?.action === 'dismiss'
                ? 'The content stays up and the report is closed.'
                : pending?.action === 'unhide'
                  ? 'The content becomes visible in feeds again.'
                  : 'The content disappears from every feed. Only its author still sees it.'}
        </Text>

        <TextInput
          style={[styles.reasonInput, isNightMode && styles.reasonInputNight]}
          placeholder="Reason (optional — saved to the audit log)"
          placeholderTextColor={isNightMode ? ON_DARK_SURFACE.muted : COLORS.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (pending?.action === 'delete' || pending?.action === 'block_account') && styles.confirmDanger,
            act.isPending && styles.busy,
          ]}
          onPress={confirm}
          disabled={act.isPending}
          activeOpacity={0.85}
        >
          {act.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.confirmText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    lineHeight: 34,
    color: ON_DARK_SURFACE.primary,
  },
  subtitle: { fontSize: 13, color: ON_DARK_SURFACE.secondary, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  chip: {
    borderRadius: RADIUS.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: 'rgba(200,230,192,0.18)', borderColor: COLORS.mint },
  chipText: { fontSize: 12, fontWeight: '700', color: ON_DARK_SURFACE.secondary },
  chipTextActive: { color: COLORS.mint },
  list: { padding: SPACING.md, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 62, height: 62, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.10)' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyIcon: { fontSize: 22, opacity: 0.7 },
  cardText: { flex: 1, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  reasonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(232,169,156,0.22)',
  },
  reasonText: { fontSize: 10, fontWeight: '800', color: COLORS.dangerLight },
  targetType: { fontSize: 10, fontWeight: '700', color: ON_DARK_SURFACE.secondary, textTransform: 'uppercase' },
  hiddenBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  hiddenText: { fontSize: 9, fontWeight: '900', color: ON_DARK_SURFACE.primary, letterSpacing: 0.5 },
  caption: { fontSize: 13, lineHeight: 18, color: ON_DARK_SURFACE.primary },
  author: { fontSize: 11, color: ON_DARK_SURFACE.secondary },
  meta: { fontSize: 11, color: ON_DARK_SURFACE.secondary, marginTop: 2 },
  details: { fontSize: 12, fontStyle: 'italic', color: ON_DARK_SURFACE.secondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  dismissText: { fontSize: 12, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  hideBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(232,184,75,0.25)',
    alignItems: 'center',
  },
  hideText: { fontSize: 12, fontWeight: '800', color: COLORS.amberLight },
  unhideBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(200,230,192,0.2)',
    alignItems: 'center',
  },
  unhideText: { fontSize: 12, fontWeight: '800', color: COLORS.mint },
  deleteBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(194,74,59,0.35)',
    alignItems: 'center',
  },
  deleteText: { fontSize: 12, fontWeight: '800', color: COLORS.dangerLight },
  resolved: { fontSize: 11, color: ON_DARK_SURFACE.secondary },
  sheetBody: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, marginBottom: SPACING.md },
  reasonInput: {
    minHeight: 70,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(139,107,71,0.3)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
  },
  confirmDanger: { backgroundColor: COLORS.danger },
  confirmText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  busy: { opacity: 0.6 },
  sheetBodyNight: { color: ON_DARK_SURFACE.secondary },
  reasonInputNight: { color: ON_DARK_SURFACE.primary, borderColor: 'rgba(255,255,255,0.2)' },
});
