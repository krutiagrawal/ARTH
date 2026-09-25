import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMyReviews } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiMyReview } from '../api/orders';

function Stars({ rating }: { rating: number }) {
  return <Text style={styles.stars}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</Text>;
}

function ReviewRow({ r, navigation }: { r: ApiMyReview; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { orderId: r.orderId })} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{r.nurseryName}</Text>
          <Stars rating={r.nurseryRating} />
          {r.comment && <Text style={styles.comment} numberOfLines={2}>{r.comment}</Text>}
          <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</Text>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function MyReviewsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reviews, isLoading, refetch } = useMyReviews();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

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
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !reviews || reviews.length === 0 ? (
        <EmptyState icon="⭐" title="No reviews yet" body="Reviews you leave for nurseries will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {reviews.map((r) => (
            <ReviewRow key={r.id} r={r} navigation={navigation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  stars: { fontSize: 13, color: COLORS.golden, marginTop: 2 },
  comment: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
});
