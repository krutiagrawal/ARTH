import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { DECORATION_COMPONENTS, ECOSYSTEM_ZONES, DRAW_TOOL_VARIANTS, type EcosystemZoneKey } from '../../constants/decorationCatalog';
import { useDecorationTypes, useCreateDecorationPlacement } from '../../hooks/useApiQueries';
import type { ApiDecorationType } from '../../api/decorations';

const { width: SW } = Dimensions.get('window');
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {zoneMeta?.icon} {zoneMeta?.name}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: 'rgba(10,26,18,0.97)',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  close: {
    fontSize: 18,
    color: COLORS.white,
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
    marginBottom: 14,
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
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 14,
  },
});
