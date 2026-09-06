import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BlurCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useHaptics } from '../hooks/useHaptics';
import { useNurseryReviews, useRespondToReview } from '../hooks/useApiQueries';
import type { ApiNurseryReview } from '../api/nursery';

function ReviewRow({ review }: { review: ApiNurseryReview }) {
  const respondMutation = useRespondToReview();
  const { success } = useHaptics();
  const [responding, setResponding] = useState(false);
  const [text, setText] = useState('');

  return (
    <BlurCard tint="light" noPadding style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.avatar}>{review.user.avatarEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewer}>{review.user.name}</Text>
          <Text style={styles.stars}>{'★'.repeat(review.nurseryRating)}{'☆'.repeat(5 - review.nurseryRating)}</Text>
        </View>
        <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString()}</Text>
      </View>
      {review.comment ? <Text style={styles.comment}>"{review.comment}"</Text> : null}

      {review.nurseryResponse ? (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>Your response</Text>
          <Text style={styles.responseText}>{review.nurseryResponse}</Text>
        </View>
      ) : responding ? (
        <View style={styles.responseForm}>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Write a response…" placeholderTextColor={COLORS.textMuted} multiline />
          <TouchableOpacity
            style={styles.sendButton}
            disabled={!text.trim() || respondMutation.isPending}
            onPress={async () => {
              await respondMutation.mutateAsync({ id: review.id, response: text.trim() });
              success();
              setResponding(false);
            }}
          >
            <Text style={styles.sendText}>{respondMutation.isPending ? 'Sending…' : 'Send response'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setResponding(true)} style={styles.respondButton}>
          <Text style={styles.respondText}>Respond</Text>
        </TouchableOpacity>
      )}
    </BlurCard>
  );
}

export function NurseryReviewsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reviews = [], isLoading } = useNurseryReviews();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Reviews" subtitle="What customers say about you" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 20 }} />
      ) : reviews.length === 0 ? (
        <EmptyState icon="⭐" title="No reviews yet" body="Reviews from customers who received their order will show up here." />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SPACING.md },
  row: { borderRadius: RADIUS.md, padding: 14, marginBottom: 10, gap: 8 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { fontSize: 24 },
  reviewer: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  stars: { fontSize: 13, color: COLORS.amber, marginTop: 2 },
  date: { fontSize: 11, color: COLORS.textMuted },
  comment: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  responseBox: { backgroundColor: 'rgba(94,133,80,0.08)', borderRadius: RADIUS.md, padding: 10 },
  responseLabel: { fontSize: 11, fontWeight: '700', color: COLORS.forest, textTransform: 'uppercase', letterSpacing: 0.3 },
  responseText: { fontSize: 13, color: COLORS.textPrimary, marginTop: 4 },
  respondButton: { alignSelf: 'flex-start' },
  respondText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  responseForm: { gap: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.2)',
    padding: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sendButton: { alignSelf: 'flex-end', backgroundColor: COLORS.forest, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  sendText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
});
