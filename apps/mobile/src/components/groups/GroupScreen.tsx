import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { ScreenHeader } from '../common/ScreenHeader';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { infiniteScrollProps } from '../../hooks/useInfiniteList';

interface GroupScreenProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Refetchers wired to pull-to-refresh. */
  refetch?: Array<() => unknown>;
  /** Extra space under the content, e.g. the bottom-nav clearance inside the group tabs. */
  bottomPad?: number;
  /** A paged query, to load the next page when the user nears the bottom. */
  paged?: Parameters<typeof infiniteScrollProps>[0];
  /** Render just the content, inside another screen's tab (no header, gradient or scrolling of its own). */
  embedded?: boolean;
}

/** The page chrome every group screen shares: gradient, header, pull-to-refresh, safe padding. */
export function GroupScreen({ title, subtitle, onBack, right, children, refetch, bottomPad, paged, embedded }: GroupScreenProps) {
  const insets = useSafeAreaInsets();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  if (embedded) {
    return (
      <View>
        {right ? <View style={styles.embeddedRight}>{right}</View> : null}
        {children}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      <ScreenHeader title={title} subtitle={subtitle} onBack={onBack} right={right} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad ?? insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...(paged ? infiniteScrollProps(paged) : {})}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  embeddedRight: { alignItems: 'flex-end', marginBottom: 8 },
});
