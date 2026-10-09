import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { TEXT } from '../../constants/typography';
import { SPACING } from '../../constants/theme';
import { ScreenHeader } from '../common/ScreenHeader';
import { AnimatedButton } from '../common/AnimatedButton';

interface GameScreenShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Lay children out over the full remaining height (no scrolling) — for board games like Grove Word. */
  fill?: boolean;
  children?: React.ReactNode;
}

/** Common frame for every game screen: gradient, header, scroll area, and load/error states. */
export function GameScreenShell({ title, subtitle, onBack, loading, error, onRetry, fill, children }: GameScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={GRADIENTS.mintFresh as any} style={StyleSheet.absoluteFill} />
      <ScreenHeader title={title} subtitle={subtitle} onBack={onBack} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load today's puzzle.</Text>
          {onRetry ? <AnimatedButton label="Try again" onPress={onRetry} variant="primary" size="md" style={styles.retry} /> : null}
        </View>
      ) : fill ? (
        <View style={[styles.fill, { paddingBottom: insets.bottom + SPACING.md }]}>{children}</View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  fill: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  errorText: { ...TEXT.body, color: COLORS.textSecondary, textAlign: 'center' },
  retry: { marginTop: SPACING.md },
});
