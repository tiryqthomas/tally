import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { keyColors } from './machine';
import { colors, fonts, radius, spacing, themed, type } from './theme';

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
  // Primary and spend are solid ink, secondary is white with a hairline, danger is red.
  // A disabled button is a plain white one, not a faded one.
  const key = keyColors(disabled || variant === 'secondary' ? 'light' : variant === 'danger' ? 'red' : 'grey');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: key.face, borderColor: key.edge },
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, { color: disabled ? colors.muted : key.text }]}>{title}</Text>
    </Pressable>
  );
}

// A plain text action in the accent color, e.g. "+ Add category". Used wherever a list can grow.
export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.textLink}>
      <Text style={styles.textLinkText}>{title}</Text>
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

// `first` drops the gap above, for a title at the very top of a screen.
export function SectionTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return <Text style={[styles.sectionTitle, first && { marginTop: spacing.xs }]}>{children}</Text>;
}

export const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.gutter, paddingBottom: 132 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.display,
    padding: spacing.md + 2,
    marginBottom: spacing.sm,
  },
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: {},
  buttonText: { fontFamily: fonts.bold, fontSize: 16 },
  label: { fontFamily: fonts.label, ...type.label, color: colors.muted, marginBottom: spacing.sm - 2 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  // White with a hairline; solid ink when picked. At least 44pt tall, Apple's minimum touch target.
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: keyColors('light').edge,
  },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.label, color: colors.text, ...type.body },
  chipTextSelected: { color: colors.onInk },
  barTrack: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 3 },
  // Section titles are the serif, big enough to lead the cards under them.
  sectionTitle: {
    fontFamily: fonts.serif,
    ...type.section,
    color: colors.text,
    marginTop: spacing.xl + 4,
    marginBottom: spacing.md - 4,
    paddingHorizontal: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  textLinkText: { fontFamily: fonts.bold, ...type.body, color: colors.accent },
  screenTitle: { fontFamily: fonts.serif, ...type.screen, color: colors.text },
  title: { fontFamily: fonts.bold, ...type.headline, color: colors.text },
  body: { fontFamily: fonts.body, ...type.body, color: colors.text },
  muted: { fontFamily: fonts.body, ...type.body, color: colors.muted },
  big: { fontFamily: fonts.display, ...type.hero, color: colors.text, fontVariant: ['tabular-nums'] },
  money: { fontFamily: fonts.number, ...type.body, color: colors.text, fontVariant: ['tabular-nums'] },
}));
