import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Share } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { TEXT } from '../../constants/typography';
import { resolveMediaUrl } from '../../api/client';
import { CAMPAIGN_CATEGORIES, type ApiCampaign } from '../../api/donations';

const rupees = (cents: number) => `₹${(cents / 100).toLocaleString('en-IN')}`;
const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Everything a donor weighs up before giving: what it is, how far along, who's behind it, how long is left. */
export function CampaignSummary({ campaign, onOpenNgo }: { campaign: ApiCampaign; onOpenNgo: () => void }) {
  const cover = resolveMediaUrl(campaign.coverPhotoUri);
  const category = CAMPAIGN_CATEGORIES.find((c) => c.key === campaign.category);
  const percent = campaign.goalAmountCents ? Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100)) : null;

  const msLeft = campaign.endsAt ? new Date(campaign.endsAt).getTime() - Date.now() : null;
  const daysLeft = msLeft != null ? Math.ceil(msLeft / 86_400_000) : null;
  const ended = campaign.status === 'closed' || (msLeft != null && msLeft <= 0);
  const goalReached = campaign.goalAmountCents != null && campaign.raisedAmountCents >= campaign.goalAmountCents;

  const badge = ended
    ? { text: 'Closed', color: COLORS.textMuted }
    : goalReached
      ? { text: 'Goal reached', color: COLORS.forest }
      : daysLeft != null
        ? { text: daysLeft <= 1 ? 'Ends today' : `${daysLeft} days left`, color: daysLeft <= 3 ? COLORS.coral : COLORS.earth }
        : { text: 'Open-ended', color: COLORS.forest };

  const share = () => {
    Share.share({
      message: `Support "${campaign.title}" by ${campaign.ngoName}${campaign.goalAmountCents ? ` — ${rupees(campaign.raisedAmountCents)} raised of ${rupees(campaign.goalAmountCents)}` : ''}. Donate on ARTH 💚`,
    }).catch(() => undefined);
  };

  const supporters =
    campaign.recentDonors.length > 0
      ? `${campaign.recentDonors.join(', ')}${campaign.donorCount > campaign.recentDonors.length ? ` and ${campaign.donorCount - campaign.recentDonors.length} more` : ''} donated`
      : null;

  return (
    <View style={styles.wrap}>
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : null}

      <View style={styles.pillRow}>
        {category ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{category.emoji} {category.label}</Text>
          </View>
        ) : null}
        <View style={[styles.pill, { backgroundColor: `${badge.color}22` }]}>
          <Text style={[styles.pillText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>

      <Text style={styles.title}>{campaign.title}</Text>
      <TouchableOpacity onPress={onOpenNgo} activeOpacity={0.7} accessibilityRole="link">
        <Text style={styles.ngo}>by {campaign.ngoName} ›</Text>
      </TouchableOpacity>

      <View style={styles.raisedBlock}>
        <Text style={styles.raised}>{rupees(campaign.raisedAmountCents)}</Text>
        <Text style={styles.raisedOf}>
          {campaign.goalAmountCents ? `raised of ${rupees(campaign.goalAmountCents)}` : 'raised so far'}
        </Text>
      </View>
      {percent != null && (
        <View style={styles.trackWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percent}>{percent}%</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <Stat value={String(campaign.donorCount)} label={campaign.donorCount === 1 ? 'Donor' : 'Donors'} />
        <View style={styles.divider} />
        <Stat
          value={percent != null ? rupees(Math.max(campaign.goalAmountCents! - campaign.raisedAmountCents, 0)) : '—'}
          label="Still needed"
        />
        <View style={styles.divider} />
        <Stat value={campaign.endsAt ? longDate(campaign.endsAt) : 'No end date'} label={ended ? 'Ended' : 'Ends'} />
      </View>

      {supporters ? <Text style={styles.supporters}>💚 {supporters}</Text> : null}

      <Text style={styles.sectionLabel}>About this campaign</Text>
      <Text style={styles.description}>{campaign.description}</Text>

      {campaign.anonymousRaisedCents > 0 && (
        <Text style={styles.meta}>🕶️ {rupees(campaign.anonymousRaisedCents)} of this was given anonymously</Text>
      )}
      <Text style={styles.meta}>Started {longDate(campaign.createdAt)}</Text>

      <TouchableOpacity style={styles.shareBtn} onPress={share} activeOpacity={0.8} accessibilityRole="button">
        <Text style={styles.shareText}>↗  Share this campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  cover: { width: '100%', height: 190, borderRadius: RADIUS.lg, backgroundColor: COLORS.mintLight, marginBottom: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, backgroundColor: 'rgba(139,107,71,0.12)' },
  pillText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  title: { ...TEXT.heading, fontSize: 22, color: COLORS.textPrimary },
  ngo: { fontSize: 14, fontWeight: '600', color: COLORS.forest, marginTop: 4 },
  raisedBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 18 },
  raised: { fontSize: 26, fontWeight: '800', color: COLORS.forest },
  raisedOf: { fontSize: 13, color: COLORS.textSecondary },
  trackWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(94,133,80,0.18)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.sage },
  percent: { fontSize: 12, fontWeight: '800', color: COLORS.forest, width: 38, textAlign: 'right' },
  statsRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, borderRadius: RADIUS.md, paddingVertical: 12, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  divider: { width: 1, height: 26, backgroundColor: border },
  supporters: { fontSize: 13, color: COLORS.textSecondary, marginTop: 14, lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  shareBtn: { alignItems: 'center', paddingVertical: 11, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.forest, marginTop: 18 },
  shareText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
});
