import { Pressable, Text, View } from 'react-native';

import { ENVELOPE_PRESETS } from '@/lib/presets';
import { colors, spacing } from './theme';
import { styles } from './ui';

// Grouped preset envelope names. Names already in use are hidden.
export function PresetPicker({ taken, onPick }: { taken: string[]; onPick: (name: string) => void }) {
  const used = new Set(taken.map((t) => t.trim().toLowerCase()));
  return (
    <View>
      {ENVELOPE_PRESETS.map(({ group, names }) => {
        const open = names.filter((n) => !used.has(n.toLowerCase()));
        if (open.length === 0) return null;
        return (
          <View key={group} style={{ marginBottom: spacing.sm }}>
            <Text style={[styles.muted, { marginBottom: spacing.xs }]}>{group}</Text>
            <View style={styles.chips}>
              {open.map((name) => (
                <Pressable key={name} onPress={() => onPick(name)} style={styles.chip} accessibilityRole="button">
                  <Text style={styles.chipText}>
                    <Text style={{ color: colors.accent }}>+ </Text>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
