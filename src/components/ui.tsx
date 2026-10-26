import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { keyColors } from './machine';
import { colors, fonts, radius, spacing } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'spend';
  disabled?: boolean;
}) {
  // Each variant is a calculator key: grey, light, or red.
  const key = keyColors(variant === 'primary' ? 'grey' : variant === 'secondary' ? 'light' : 'red');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: key.face, borderBottomColor: key.edge },
        pressed && styles.buttonPressed,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.buttonText, { color: key.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

// A row of pill buttons for picking one option.
export function Chips<T extends string>({
  options,
  value,
  onChange,
  trailing,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  // Shown after the last chip, e.g. a button to add an option.
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
      {trailing}
    </View>
  );
}

// Like Chips, but any number can be picked. Tapping a chip turns it on or off.
export function MultiChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() =>
              // Keep the options' order so saved settings don't depend on tap order.
              onChange(options.map((x) => x.value).filter((v) => (v === o.value ? !selected : value.includes(v))))
            }
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ fraction, danger }: { fraction: number; danger?: boolean }) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.barTrack}>
      <View
        style={[styles.barFill, { width: `${clamped * 100}%`, backgroundColor: danger ? colors.danger : colors.text }]}
      />
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 120 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 3,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  button: {
    borderRadius: radius.md,
    borderBottomWidth: 4,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonPressed: { borderBottomWidth: 1, marginTop: 3 },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, marginBottom: spacing.xs, letterSpacing: 1, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  // Chips are small keys: light grey, blue when picked.
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: keyColors('light').face,
    borderBottomWidth: 3,
    borderBottomColor: keyColors('light').edge,
  },
  chipSelected: { backgroundColor: keyColors('blue').face, borderBottomColor: keyColors('blue').edge },
  chipText: { fontFamily: fonts.label, color: colors.text, fontSize: 15 },
  chipTextSelected: { fontFamily: fonts.bold, color: '#fff' },
  barTrack: { height: 6, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  big: { fontFamily: fonts.display, fontSize: 36, color: colors.text },
  money: { fontFamily: fonts.mono, fontSize: 15, color: colors.text },
});
