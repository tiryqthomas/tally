import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { formatMoney } from '@/lib/money';
import { colors, fonts, machine, radius, spacing } from './theme';

// Calculator digits: no dollar sign, always cents, e.g. -123456 -> "-1,234.56".
export function digits(cents: number): string {
  return formatMoney(cents).replace('$', '');
}

type KeyColor = 'grey' | 'light' | 'blue' | 'red' | 'yellow';

const KEY: Record<KeyColor, { face: string; edge: string; text: string }> = {
  grey: { face: machine.key, edge: machine.keyEdge, text: '#FFFFFF' },
  light: { face: machine.keyLight, edge: machine.keyLightEdge, text: colors.text },
  blue: { face: machine.blue, edge: machine.blueEdge, text: '#FFFFFF' },
  red: { face: machine.red, edge: machine.redEdge, text: '#FFFFFF' },
  yellow: { face: machine.yellow, edge: machine.yellowEdge, text: '#2A2005' },
};

export function keyColors(color: KeyColor) {
  return KEY[color];
}

// A chunky calculator key. It sinks a little when pressed.
export function Key({
  color = 'grey',
  onPress,
  children,
  style,
  accessibilityLabel,
  disabled,
}: {
  color?: KeyColor;
  onPress?: () => void;
  children: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const k = KEY[color];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: k.face, borderBottomColor: k.edge },
        pressed && styles.keyPressed,
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// Small label and amount printed on a key.
export function KeyLabel({ color = 'grey', label, value }: { color?: KeyColor; label: string; value?: string }) {
  const text = KEY[color].text;
  return (
    <>
      <Text style={[styles.keyLabel, { color: text }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.keyValue, { color: text }]}>{value}</Text>}
    </>
  );
}

// The dark window with glowing blue digits.
export function Display({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.display, style]}>{children}</View>;
}

export function DisplayLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.displayLabel}>{children}</Text>;
}

export function DisplayDigits({ children, size = 40 }: { children: ReactNode; size?: number }) {
  return (
    <Text style={[styles.digits, { fontSize: size, lineHeight: size * 1.15 }]} numberOfLines={1} adjustsFontSizeToFit>
      {children}
    </Text>
  );
}

export function DisplayNote({ children }: { children: ReactNode }) {
  return <Text style={styles.displayNote}>{children}</Text>;
}

// A strip of receipt paper with a torn top edge.
export function PaperTape({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: spacing.sm }, style]}>
      <Svg width="100%" height={6} viewBox="0 0 100 6" preserveAspectRatio="none">
        <Polygon points={TORN} fill={colors.card} />
      </Svg>
      <View style={styles.tape}>{children}</View>
    </View>
  );
}

const TORN = Array.from({ length: 21 }, (_, i) => `${i * 5},${i % 2 ? 0 : 6}`)
  .concat(['100,6', '0,6'])
  .join(' ');

// A printed progress bar: a row of little ink blocks.
export function TickBar({ fraction, red, ticks = 24 }: { fraction: number; red?: boolean; ticks?: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * ticks);
  const ink = red ? colors.danger : colors.text;
  return (
    <View style={styles.ticks}>
      {Array.from({ length: ticks }, (_, i) => (
        <View key={i} style={[styles.tick, { backgroundColor: i < filled ? ink : colors.border }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  key: {
    borderRadius: radius.md,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  keyPressed: { borderBottomWidth: 1, marginTop: 3, shadowOpacity: 0.1 },
  keyLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', opacity: 0.9 },
  keyValue: { fontFamily: fonts.display, fontSize: 21, marginTop: 1 },
  display: {
    backgroundColor: machine.display,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 2,
    borderColor: '#2B2F36',
  },
  displayLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color: machine.label, textTransform: 'uppercase' },
  digits: {
    fontFamily: fonts.display,
    color: machine.digit,
    textAlign: 'right',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(111,230,242,0.6)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  displayNote: { fontFamily: fonts.display, fontSize: 13, color: machine.digitDim, textAlign: 'right', letterSpacing: 0.5 },
  tape: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ticks: { flexDirection: 'row', gap: 2, marginTop: 4 },
  tick: { flex: 1, height: 6 },
});
