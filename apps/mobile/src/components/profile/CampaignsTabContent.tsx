import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';
import type { ApiCampaign } from '../../api/donations';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function CampaignRow({ campaign, onPress }: { campaign: ApiCampaign; onPress: () => void }) {
  const cover = resolveMediaUrl(campaign.coverPhotoUri);
  const progress = campaign.goalAmountCents ? Math.min(1, campaign.raisedAmountCents / campaign.goalAmountCents) : null;
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={{ fontSize: 20 }}>🎗️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatRupees(campaign.raisedAmountCents)} raised{campaign.goalAmountCents ? ` of ${formatRupees(campaign.goalAmountCents)}` : ''}
        </Text>
        {progress != null && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
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
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 14, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, backgroundColor: COLORS.mintLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.beige, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 3 },
});
