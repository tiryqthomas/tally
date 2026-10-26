import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { addMonths, monthLabel } from '@/lib/dates';
import type { Month } from '@/lib/types';
import { colors, spacing } from './theme';
import { styles } from './ui';

// "‹ October 2026 ›", for screens that look at one month at a time.
export function MonthSwitcher({ month, onChange, max }: { month: Month; onChange: (m: Month) => void; max?: Month }) {
  const canGoForward = !max || month < max;
  return (
    <View style={[styles.row, { marginBottom: spacing.md }]}>
      <Pressable accessibilityLabel="Previous month" hitSlop={12} onPress={() => onChange(addMonths(month, -1))}>
        <Ionicons name="chevron-back" size={22} color={colors.accent} />
      </Pressable>
      <Text style={styles.title}>{monthLabel(month)}</Text>
      <Pressable
        accessibilityLabel="Next month"
        hitSlop={12}
        disabled={!canGoForward}
        onPress={() => onChange(addMonths(month, 1))}
        style={{ opacity: canGoForward ? 1 : 0.3 }}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.accent} />
      </Pressable>
    </View>
  );
}
