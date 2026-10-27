import { StyleSheet, Text, View } from 'react-native';

import type { CategoryColor } from '@/lib/types';
import { AbacusRod } from './Abacus';
import { categoryShades, colors, fonts, radius, themed, type } from './theme';

type Hue = CategoryColor | 'savings';

// A category's mark: a rounded tile in its tint with its first letter in its color.
export function CategoryBadge({ color, name, size = 36 }: { color: Hue; name: string; size?: number }) {
  const shade = categoryShades(color);
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 3, backgroundColor: shade.tint }]}
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initial, { color: shade.ink, fontSize: size * 0.44 }]}>{name.trim().charAt(0).toUpperCase() || '·'}</Text>
    </View>
  );
}

// The abacus rod in a category's color.
export function CategoryRod({ color, fraction, hollow }: { color: Hue; fraction: number; hollow?: string }) {
  const shade = categoryShades(color);
  return <AbacusRod fraction={fraction} color={shade.fill} string={shade.rod} hollow={hollow} />;
}

// Shown beside a category's name when it has gone over. Red only ever means this.
export function OverPill() {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>Over</Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    badge: { alignItems: 'center', justifyContent: 'center' },
    initial: { fontFamily: fonts.bold },
    pill: { backgroundColor: colors.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
    pillText: { fontFamily: fonts.bold, ...type.label, fontSize: 11, color: colors.danger },
  }),
);
