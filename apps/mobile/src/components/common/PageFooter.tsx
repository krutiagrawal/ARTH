import React from 'react';
import { ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';

/** Spinner shown under a list while its next page is loading. */
export function PageFooter({ loading }: { loading: boolean }) {
  return loading ? <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 16 }} /> : null;
}
