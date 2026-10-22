import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';
import { CAMPAIGN_CATEGORIES, type ApiCampaign } from '../../api/donations';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function timeLeft(campaign: ApiCampaign): { text: string; urgent: boolean } | null {
  if (campaign.status === 'closed') return { text: 'Closed', urgent: false };
  if (!campaign.endsAt) return null;
  const days = Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return { text: 'Ended', urgent: false };
  return { text: days === 1 ? 'Ends today' : `${days} days left`, urgent: days <= 3 };
}

function CampaignRow({ campaign, onPress }: { campaign: ApiCampaign; onPress: () => void }) {
  const cover = resolveMediaUrl(campaign.coverPhotoUri);
  const category = CAMPAIGN_CATEGORIES.find((c) => c.key === campaign.category);
  const percent = campaign.goalAmountCents ? Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100)) : null;
  const left = timeLeft(campaign);

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={{ fontSize: 20 }}>{category?.emoji ?? '🎗️'}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatRupees(campaign.raisedAmountCents)}
          {campaign.goalAmountCents ? ` of ${formatRupees(campaign.goalAmountCents)}` : ' raised'}
          {`  ·  👥 ${campaign.donorCount}`}
        </Text>
        {percent != null && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
        )}
      </View>
      {left ? (
        <View style={[styles.pill, left.urgent && styles.pillUrgent]}>
          <Text style={[styles.pillText, left.urgent && styles.pillTextUrgent]}>{left.text}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/** An NGO's active donation campaigns, shown on its public profile. */
export function CampaignsTabContent({ campaigns, onPressCampaign }: { campaigns: ApiCampaign[]; onPressCampaign: (c: ApiCampaign) => void }) {
  if (campaigns.length === 0) {
    return <EmptyState icon="🎗️" title="No active campaigns" body="This NGO isn't running a donation campaign right now." />;
  }

  return (
    <View style={styles.wrap}>
      {campaigns.map((campaign) => (
        <CampaignRow key={campaign.id} campaign={campaign} onPress={() => onPressCampaign(campaign)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
  },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.mintLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(94,133,80,0.18)', marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 3 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(139,107,71,0.14)' },
  pillUrgent: { backgroundColor: 'rgba(232,137,106,0.2)' },
  pillText: { fontSize: 10, fontWeight: '800', color: COLORS.earth },
  pillTextUrgent: { color: COLORS.coral },
});
