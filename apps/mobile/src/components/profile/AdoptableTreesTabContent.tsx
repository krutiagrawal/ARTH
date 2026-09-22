import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { EmptyState } from '../common/EmptyState';
import { resolveMediaUrl } from '../../api/client';
import type { ApiAdoptableTree } from '../../api/adoptions';

function TreeRow({ tree, onPress }: { tree: ApiAdoptableTree; onPress: () => void }) {
  const cover = resolveMediaUrl(tree.photoUri);
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={{ fontSize: 20 }}>🌳</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{tree.nickname}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {tree.speciesName}{tree.city ? ` · ${tree.city}` : ''}
        </Text>
        {tree.isAdopted && <Text style={styles.adopted}>Already adopted</Text>}
      </View>
    </TouchableOpacity>
  );
}

/** An NGO's available-for-adoption trees, shown on its public profile. */
export function AdoptableTreesTabContent({ trees, onPressTree }: { trees: ApiAdoptableTree[]; onPressTree: (t: ApiAdoptableTree) => void }) {
  if (trees.length === 0) {
    return <EmptyState icon="🌳" title="No trees listed for adoption" body="This NGO hasn't listed a tree for adoption yet." />;
  }

  return (
    <View style={styles.wrap}>
      {trees.map((tree) => (
        <TreeRow key={tree.id} tree={tree} onPress={() => onPressTree(tree)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, backgroundColor: COLORS.mintLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  adopted: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
