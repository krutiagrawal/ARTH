import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { EmptyState } from '../components/common/EmptyState';
import { useHaptics } from '../hooks/useHaptics';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '../hooks/useApiQueries';
import type { ApiCartItem } from '../api/cart';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function CartRow({ item }: { item: ApiCartItem }) {
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveCartItem();
  const { light } = useHaptics();

  const adjust = (delta: number) => {
    const next = item.quantity + delta;
    light();
    if (next < 1) {
      removeMutation.mutate(item.id);
    } else if (next <= item.availableQuantity) {
      updateMutation.mutate({ itemId: item.id, quantity: next });
    }
  };

  return (
    <BorderCard noPadding style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.species}>{item.species}</Text>
        <Text style={styles.nursery}>{item.nursery.nurseryName}</Text>
        <Text style={styles.price}>{formatRupees(item.priceCents)} each</Text>
      </View>
      <View style={styles.stepperRow}>
        <TouchableOpacity style={styles.stepperButton} onPress={() => adjust(-1)}>
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{item.quantity}</Text>
        <TouchableOpacity style={styles.stepperButton} onPress={() => adjust(1)} disabled={item.quantity >= item.availableQuantity}>
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </BorderCard>
  );
}

export function CartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: cart, isLoading } = useCart();

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
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState icon="🛒" title="Your cart is empty" body="Browse a nursery and add saplings to get started." />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {cart.items.map((item) => (
              <CartRow key={item.id} item={item} />
            ))}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatRupees(cart.subtotalCents)}</Text>
            </View>
            <AnimatedButton label="Proceed to checkout" onPress={() => navigation.navigate('Checkout')} variant="primary" size="lg" fullWidth />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  species: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  nursery: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  price: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { fontSize: 18, fontWeight: '700', color: COLORS.forest },
  stepperValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(94,133,80,0.15)' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  subtotalLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  subtotalValue: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '800' },
});
