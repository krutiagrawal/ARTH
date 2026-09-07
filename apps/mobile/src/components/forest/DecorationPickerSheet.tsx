import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { DECORATION_COMPONENTS, ECOSYSTEM_ZONES, DRAW_TOOL_VARIANTS, type EcosystemZoneKey } from '../../constants/decorationCatalog';
import { useDecorationTypes, useCreateDecorationPlacement } from '../../hooks/useApiQueries';
import type { ApiDecorationType } from '../../api/decorations';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_WIDTH = (SW - 32 - 24) / 3;

export function DecorationPickerSheet({
  zone,
  visible,
  onClose,
  onDraw,
}: {
  zone: EcosystemZoneKey | null;
  visible: boolean;
  onClose: () => void;
  /** Called instead of instant-placement when the user taps a "draw it yourself" tool card
   * (e.g. "Draw a River") — the caller hands off to a freehand drawing gesture. */
  onDraw: (type: ApiDecorationType) => void;
}) {
  const { data: allTypes = [] } = useDecorationTypes();
  const createMutation = useCreateDecorationPlacement();

  const zoneMeta = ECOSYSTEM_ZONES.find((z) => z.key === zone);
  const zoneTypes = zone ? allTypes.filter((t) => t.zone === zone).sort((a, b) => a.sortOrder - b.sortOrder) : [];

  const handlePick = (type: ApiDecorationType) => {
    if (DRAW_TOOL_VARIANTS.has(type.variant)) {
      onDraw(type);
      onClose();
      return;
    }
    // Drop new items near the centre of the visible forest with a little jitter, then let the
    // user freely move / resize / rotate them — no per-zone placement constraints.
    const positionX = 0.5 + (Math.random() - 0.5) * 0.2;
    const positionY = 0.4 + (Math.random() - 0.5) * 0.16;
    createMutation.mutate({ decorationTypeId: type.id, positionX, positionY, scale: 1, rotation: 0 });
    onClose();
  };

  const title = [zoneMeta?.icon, zoneMeta?.name].filter(Boolean).join(' ');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="slideUp"
      title={title}
      surface="dark"
      surfaceColor={COLORS.nightForest}
      maxHeight={SH * 0.7}
    >
      <Text style={styles.subtitle}>Tap an option to add it to your forest</Text>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {zoneTypes.map((type) => {
          const isDrawTool = DRAW_TOOL_VARIANTS.has(type.variant);
          const Shape = DECORATION_COMPONENTS[type.variant];
          return (
            <TouchableOpacity
              key={type.id}
              style={styles.optionCard}
              activeOpacity={0.8}
              disabled={createMutation.isPending}
              onPress={() => handlePick(type)}
            >
              <View style={styles.optionPreview}>
                {isDrawTool ? (
                  <Text style={styles.drawToolIcon}>✏️</Text>
                ) : (
                  Shape && <Shape color={type.colorway} size={44} />
                )}
              </View>
              <Text style={styles.optionName} numberOfLines={2}>
                {type.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: ON_DARK_SURFACE.secondary,
    textTransform: 'none',
    letterSpacing: 0,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
  },
  optionCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 6,
  },
  optionPreview: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawToolIcon: {
    fontSize: 26,
  },
  optionName: {
    fontSize: 11,
    fontWeight: '600',
    color: ON_DARK_SURFACE.primary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
