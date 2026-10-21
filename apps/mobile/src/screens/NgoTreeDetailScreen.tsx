import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { StatusModal } from '../components/common/StatusModal';
import { usePlantedTree, useHealthCheckHistory, useLogHealthCheck, useNgoProfile } from '../hooks/useApiQueries';
import { useApprovalGate } from '../hooks/useApprovalGate';
import { resolveMediaUrl, ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';
import { STATUS_META, STATUS_TEXT_ON_FILL, STATUS_TEXT_ON_LIGHT, ACTIONABLE_STATUSES } from '../constants/treeHealth';
import type { ApiTreeHealthCheck } from '../api/plantedTrees';
import { TEXT } from '../constants/typography';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** "5 days", "3 months", "1 yr 2 mo" – tree ages read better in the largest sensible unit. */
function formatAge(days: number): string {
  if (days < 1) return 'Today';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 730) return `${Math.round(days / 30.4)} months`;
  const years = Math.floor(days / 365.25);
  const months = Math.round((days - years * 365.25) / 30.4);
  return months > 0 ? `${years} yr ${months} mo` : `${years} yrs`;
}

const OBSERVER_LABEL = { owner: 'Owner', ngo: 'Your team', community: 'Community' } as const;

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** One label/value pair stacked (label above value) so long values like an address wrap cleanly instead of crowding the label. */
function DetailRow({ icon, label, value, onPress, last }: { icon: string; label: string; value: string; onPress?: () => void; last?: boolean }) {
  const body = (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <View style={styles.detailIcon}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, onPress && styles.detailValueLink]}>{value}</Text>
      </View>
      {onPress ? <Text style={styles.detailChevron}>›</Text> : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function NgoTreeDetailScreen({ navigation, route }: any) {
  const { treeId } = route.params as { treeId: string };
  const insets = useSafeAreaInsets();
  const { data: tree, isLoading } = usePlantedTree(treeId);
  const { data: history } = useHealthCheckHistory(treeId);
  const logMutation = useLogHealthCheck();
  const { data: profile } = useNgoProfile();
  const { guard, statusModalProps } = useApprovalGate(profile?.status, 'NGO', profile?.rejectionReason);
  const confirm = useConfirm();

  const checks = history?.checks ?? [];

  const markStatus = async (status: (typeof ACTIONABLE_STATUSES)[number]) => {
    try {
      await logMutation.mutateAsync({ plantedTreeId: treeId, status });
    } catch (e) {
      const existingCheck = e instanceof ApiError && e.code === 'CONFLICT'
        ? (e.details as { existingCheck?: ApiTreeHealthCheck } | undefined)?.existingCheck
        : undefined;
      if (!existingCheck) return;

      confirm(
        'Already checked today',
        `You logged this tree as ${STATUS_META[existingCheck.status].label} earlier today. Update today's entry to ${STATUS_META[status].label} instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => logMutation.mutateAsync({ plantedTreeId: treeId, status, updateExisting: true }) },
        ],
      );
    }
  };

  const status = tree ? STATUS_META[tree.latestStatus] : null;
  const photo = tree?.photoUrl ? resolveMediaUrl(tree.photoUrl) : undefined;
  const hasGps = tree?.lat != null && tree?.lng != null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tree?.speciesName ?? 'Tree'}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading || !tree || !status ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* ---------- Hero ---------- */}
          <View style={styles.hero}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[COLORS.sageLight, COLORS.forest]} style={styles.heroImage}>
                <Text style={styles.heroEmoji}>🌳</Text>
              </LinearGradient>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.heroShade} />
            <View style={styles.heroBottom}>
              <View style={[styles.heroPill, { backgroundColor: status.color }]}>
                <Text style={[styles.heroPillText, { color: STATUS_TEXT_ON_FILL[tree.latestStatus] }]}>{status.emoji} {status.label}</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {tree.speciesName}{tree.label ? ` – ${tree.label}` : ''}
              </Text>
              <Text style={styles.heroSub}>
                Planted {fmtDate(tree.plantedAt)}
                {tree.publicId ? `  ·  ID ${tree.publicId}` : ''}
              </Text>
            </View>
          </View>

          {/* ---------- Impact so far ---------- */}
          <View style={styles.statsGrid}>
            <Stat emoji="🕓" value={tree.ageDays != null ? formatAge(tree.ageDays) : '–'} label="Age" />
            <Stat emoji="📏" value={tree.estimatedHeightM != null ? `${tree.estimatedHeightM} m` : '–'} label="Est. height" />
            <Stat emoji="🌍" value={tree.co2Kg != null ? `${tree.co2Kg} kg` : '–'} label="CO₂ stored" />
            <Stat emoji="💨" value={tree.oxygenKg != null ? `${tree.oxygenKg} kg` : '–'} label="Oxygen made" />
          </View>
          {tree.co2NextYearKg ? (
            <Text style={styles.impactNote}>
              Expected to store about {tree.co2NextYearKg} kg more CO₂ over the next year. Figures are estimates from the species and age
              {tree.impactConfidence === 'low' ? ' (rougher for this species)' : ''}.
            </Text>
          ) : null}

          {/* ---------- Details ---------- */}
          <Section title="Details">
            <BorderCard noPadding style={styles.card}>
              <View style={styles.cardInner}>
                <DetailRow
                  icon="🌿"
                  label="Plantation"
                  value={tree.driveTitle ?? 'Independent planting (no drive)'}
                  onPress={tree.driveId ? () => navigation.navigate('DriveDetail', { driveId: tree.driveId }) : undefined}
                />
                <DetailRow icon="🗂️" label="Zone" value={tree.zoneName ?? 'Unzoned'} />
                <DetailRow icon="📅" label="Planted on" value={fmtDate(tree.plantedAt)} />
                <DetailRow icon="📍" label="Address" value={tree.locationLabel ?? 'No address recorded'} last={!hasGps} />
                {hasGps && (
                  <DetailRow
                    icon="🧭"
                    label="GPS coordinates"
                    value={`${tree.lat!.toFixed(5)}, ${tree.lng!.toFixed(5)}  ·  Open in Maps`}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${tree.lat},${tree.lng}`)}
                    last
                  />
                )}
              </View>
            </BorderCard>
          </Section>

          {/* ---------- Adoption ---------- */}
          {tree.listing && (
            <Section title="Adoption">
              <BorderCard noPadding style={styles.card}>
                <View style={styles.cardInner}>
                  <DetailRow
                    icon="🤝"
                    label={tree.listing.status === 'adopted' ? 'Adopted' : 'Listed for adoption'}
                    value={
                      tree.listing.status === 'adopted' && tree.listing.adopter
                        ? `${tree.listing.nickname} · by ${tree.listing.adopter.name} (@${tree.listing.adopter.handle})`
                        : `${tree.listing.nickname} · waiting for an adopter`
                    }
                    last
                  />
                </View>
              </BorderCard>
            </Section>
          )}

          {/* ---------- Follow-up checkpoints ---------- */}
          {tree.milestones && (
            <Section
              title="Follow-up checkpoints"
              hint={
                tree.nextCheck
                  ? tree.nextCheck.overdue
                    ? `The ${tree.nextCheck.days}-day check was due ${fmtDate(tree.nextCheck.dueAt)} – log a health check below.`
                    : `Next check: day ${tree.nextCheck.days}, around ${fmtDate(tree.nextCheck.dueAt)}.`
                  : 'All follow-up checks are logged. Nice work.'
              }
            >
              <View style={styles.milestoneRow}>
                {tree.milestones.map((m, i) => {
                  const state = m.checked ? 'done' : m.passed ? 'due' : 'later';
                  return (
                    <View key={m.days} style={styles.milestone}>
                      <View style={styles.milestoneTrack}>
                        <View style={[styles.milestoneLine, i === 0 && { opacity: 0 }]} />
                        <View style={[styles.milestoneDot, state === 'done' && styles.dotDone, state === 'due' && styles.dotDue]}>
                          <Text style={styles.milestoneDotText}>{state === 'done' ? '✓' : state === 'due' ? '!' : ''}</Text>
                        </View>
                        <View style={[styles.milestoneLine, i === tree.milestones!.length - 1 && { opacity: 0 }]} />
                      </View>
                      <Text style={styles.milestoneDays}>Day {m.days}</Text>
                      <Text style={styles.milestoneDate}>{fmtDate(m.dueAt).replace(/, \d{4}$/, '')}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

          {/* ---------- Mark status ---------- */}
          <Section title="Log a health check" hint="Record how this tree looks today.">
            <View style={styles.markGrid}>
              {ACTIONABLE_STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.markButton, { borderColor: STATUS_META[s].color }, tree.latestStatus === s && { backgroundColor: `${STATUS_META[s].color}22` }]}
                  disabled={logMutation.isPending}
                  onPress={guard(() => markStatus(s))}
                  activeOpacity={0.8}
                >
                  <Text style={styles.markEmoji}>{STATUS_META[s].emoji}</Text>
                  <Text style={styles.markLabel}>{STATUS_META[s].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ---------- History ---------- */}
          <Section
            title="Health-check history"
            hint={
              tree.checkCount ? `${tree.checkCount} check${tree.checkCount === 1 ? '' : 's'} · last on ${tree.lastCheckedAt ? fmtDate(tree.lastCheckedAt) : '–'}` : undefined
            }
          >
            {checks.length === 0 ? (
              <Text style={styles.empty}>No health checks logged yet.</Text>
            ) : (
              checks.map((check, i) => {
                const meta = STATUS_META[check.status];
                const checkPhoto = check.photoUrl ? resolveMediaUrl(check.photoUrl) : undefined;
                return (
                  <View key={check.id} style={styles.timelineItem}>
                    <View style={styles.timelineRail}>
                      <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
                      {i < checks.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineBody}>
                      <View style={styles.timelineTop}>
                        <Text style={[styles.timelineStatus, { color: STATUS_TEXT_ON_LIGHT[check.status] }]}>{meta.emoji} {meta.label}</Text>
                        <Text style={styles.timelineDate}>{fmtDate(check.checkedAt)}</Text>
                      </View>
                      {check.notes ? <Text style={styles.timelineNote}>{check.notes}</Text> : null}
                      {checkPhoto ? <Image source={{ uri: checkPhoto }} style={styles.timelinePhoto} resizeMode="cover" /> : null}
                    </View>
                  </View>
                );
              })
            )}
          </Section>

          {/* ---------- Updates from others ---------- */}
          {tree.observations && tree.observations.length > 0 && (
            <Section title="Updates from people" hint="Recent notes and photos from the owner, your team and the community.">
              {tree.observations.map((o) => {
                const meta = STATUS_META[o.status];
                const obsPhoto = o.photoUrl ? resolveMediaUrl(o.photoUrl) : undefined;
                return (
                  <BorderCard key={o.id} style={styles.obsCard}>
                    <View style={styles.timelineTop}>
                      <Text style={styles.obsWho}>{OBSERVER_LABEL[o.observerRole]}</Text>
                      <Text style={styles.timelineDate}>{fmtDate(o.createdAt)}</Text>
                    </View>
                    <Text style={[styles.timelineStatus, { color: STATUS_TEXT_ON_LIGHT[o.status], marginTop: 4 }]}>{meta.emoji} {meta.label}</Text>
                    {o.note ? <Text style={styles.timelineNote}>{o.note}</Text> : null}
                    {obsPhoto ? <Image source={{ uri: obsPhoto }} style={styles.timelinePhoto} resizeMode="cover" /> : null}
                  </BorderCard>
                );
              })}
            </Section>
          )}
        </ScrollView>
      )}

      <StatusModal {...statusModalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, ...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },

  hero: { height: 240, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 14, backgroundColor: COLORS.beige },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 72, opacity: 0.85 },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  heroBottom: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 4 },
  heroPill: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS.full, marginBottom: 4 },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48%',
    flexGrow: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(139, 107, 71, 0.07)',
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.forest, marginTop: 6 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  impactNote: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, marginTop: 10 },

  section: { marginTop: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  sectionHint: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 3, marginBottom: 2 },

  card: { marginTop: 10 },
  cardInner: { paddingHorizontal: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.14)' },
  detailIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(139, 107, 71, 0.10)', alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 16 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: COLORS.textPrimary, marginTop: 3 },
  detailValueLink: { color: COLORS.forest },
  detailChevron: { fontSize: 22, color: COLORS.textMuted, alignSelf: 'center' },

  milestoneRow: { flexDirection: 'row', marginTop: 12 },
  milestone: { flex: 1, alignItems: 'center' },
  milestoneTrack: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  milestoneLine: { flex: 1, height: 2, backgroundColor: 'rgba(139, 107, 71, 0.25)' },
  milestoneDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(139, 107, 71, 0.18)', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: COLORS.sage },
  dotDue: { backgroundColor: COLORS.amber },
  milestoneDotText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  milestoneDays: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginTop: 6 },
  milestoneDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  markGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  markButton: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  markEmoji: { fontSize: 18 },
  markLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },

  empty: { fontSize: 13, color: COLORS.textSecondary, marginTop: 10 },
  timelineItem: { flexDirection: 'row', gap: 12, marginTop: 12 },
  timelineRail: { alignItems: 'center', width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: 'rgba(139, 107, 71, 0.2)', marginTop: 4 },
  timelineBody: { flex: 1, paddingBottom: 6 },
  timelineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timelineStatus: { fontSize: 14, fontWeight: '800' },
  timelineDate: { fontSize: 12, color: COLORS.textSecondary },
  timelineNote: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary, marginTop: 6 },
  timelinePhoto: { width: '100%', height: 150, borderRadius: RADIUS.md, marginTop: 8, backgroundColor: COLORS.beige },

  obsCard: { marginTop: 10 },
  obsWho: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
});
