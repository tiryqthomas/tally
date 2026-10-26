import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { formatMoney } from '@/lib/money';
import { colors, fonts, machine, motion, radius, spacing, type } from './theme';

// Calculator digits: no dollar sign, always cents, e.g. -123456 -> "-1,234.56".
export function digits(cents: number): string {
  return formatMoney(cents).replace('$', '');
}

// Whether iOS/Android Reduce Motion is on. Read once at startup and kept current.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((on) => (reduceMotion = on))
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (on) => (reduceMotion = on));
export const motionAllowed = () => !reduceMotion;

type KeyColor = 'grey' | 'light' | 'blue' | 'red' | 'yellow';

// face, the darker bottom edge, a lighter top lip that makes the key look domed, and the legend color.
const KEY: Record<KeyColor, { face: string; edge: string; lip: string; text: string }> = {
  grey: { face: machine.key, edge: machine.keyEdge, lip: '#666A71', text: '#FFFFFF' },
  light: { face: machine.keyLight, edge: machine.keyLightEdge, lip: '#E4E1DA', text: colors.text },
  blue: { face: machine.blue, edge: machine.blueEdge, lip: '#7186C6', text: '#FFFFFF' },
  red: { face: machine.red, edge: machine.redEdge, lip: '#D85A4F', text: '#FFFFFF' },
  yellow: { face: machine.yellow, edge: machine.yellowEdge, lip: '#F0C565', text: '#2A2005' },
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
        { backgroundColor: k.face, borderBottomColor: k.edge, borderTopColor: k.lip },
        // A transform moves only this key; changing its margin would nudge the whole row.
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

const MONEY = /^-?[\d,]+\.\d\d$/;
const toCents = (s: string) => Math.round(Number(s.replace(/,/g, '')) * 100);

// With `roll`, a money amount counts up or down to its new value instead of jumping.
function useRolling(text: string, roll: boolean): string {
  const [shown, setShown] = useState(text);
  const last = useRef(text);
  useEffect(() => {
    const from = last.current;
    last.current = text;
    if (!roll || !motionAllowed() || !MONEY.test(from) || !MONEY.test(text) || from === text) {
      setShown(text);
      return;
    }
    const a = toCents(from);
    const b = toCents(text);
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / motion.roll);
      const eased = 1 - (1 - t) ** 3;
      setShown(t === 1 ? text : digits(Math.round(a + (b - a) * eased)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text, roll]);
  return shown;
}

export function DisplayDigits({
  children,
  size = type.hero.fontSize,
  roll = false,
  accessibilityLabel,
}: {
  children: string;
  size?: number;
  roll?: boolean;
  accessibilityLabel?: string;
}) {
  const shown = useRolling(children, roll);
  return (
    <Text
      style={[styles.digits, { fontSize: size, lineHeight: size * 1.1 }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessibilityLabel={accessibilityLabel ?? (MONEY.test(children) ? `$${children}` : children)}
    >
      {shown}
    </Text>
  );
}

export function DisplayNote({ children }: { children: ReactNode }) {
  return <Text style={styles.displayNote}>{children}</Text>;
}

// True once a tape has been on screen for a moment, so only rows added after that "print" in.
const TapeReady = createContext<{ current: boolean }>({ current: false });

// A strip of receipt paper with a torn top edge.
export function PaperTape({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const ready = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => (ready.current = true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <TapeReady.Provider value={ready}>
      <View style={[{ marginBottom: spacing.sm }, style]}>
        <Svg width="100%" height={6} viewBox="0 0 100 6" preserveAspectRatio="none">
          <Polygon points={TORN} fill={colors.card} />
        </Svg>
        <View style={styles.tape}>{children}</View>
      </View>
    </TapeReady.Provider>
  );
}

const TORN = Array.from({ length: 21 }, (_, i) => `${i * 5},${i % 2 ? 0 : 6}`)
  .concat(['100,6', '0,6'])
  .join(' ');

// Wrap a tape row so that, when it's added to a tape already on screen, it feeds in like freshly printed paper.
export function PrintIn({ children }: { children: ReactNode }) {
  const ready = useContext(TapeReady);
  const [animate] = useState(() => ready.current && motionAllowed());
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.print,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// A printed progress bar: a row of little ink blocks. On first view the blocks print one by one.
export function TickBar({ fraction, red, ticks = 24 }: { fraction: number; red?: boolean; ticks?: number }) {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * ticks);
  const [shown, setShown] = useState(() => (motionAllowed() ? 0 : filled));
  const first = useRef(true);
  useEffect(() => {
    if (!first.current || !motionAllowed()) {
      setShown(filled);
      return;
    }
    first.current = false;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setShown(Math.min(n, filled));
      if (n >= filled) clearInterval(timer);
    }, motion.tick);
    return () => clearInterval(timer);
  }, [filled]);
  const ink = red ? colors.danger : colors.text;
  return (
    <View style={styles.ticks} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: ticks }, (_, i) => (
        <View key={i} style={[styles.tick, { backgroundColor: i < shown ? ink : colors.border }]} />
      ))}
    </View>
  );
}

// A warning printed on its own strip of tape in red ink, instead of a colored box.
export function TapeNote({ children, action, onPress }: { children: ReactNode; action?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <PaperTape style={{ marginTop: spacing.md }}>
        <View style={[tape.line, { alignItems: 'flex-start' }]}>
          <Text style={[tape.caption, styles.noteInk]}>◆</Text>
          <Text style={[tape.caption, styles.noteInk, { flex: 1 }]}>{children}</Text>
          {action && <Text style={[tape.caption, styles.noteAction]}>{action} ›</Text>}
        </View>
      </PaperTape>
    </Pressable>
  );
}

// Text styles for anything printed on the tape. Names are caps; supporting lines are sentence case.
export const tape = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: fonts.monoBold, ...type.headline, color: colors.text } as TextStyle,
  text: { fontFamily: fonts.mono, ...type.body, color: colors.text } as TextStyle,
  caption: { fontFamily: fonts.mono, ...type.caption, color: colors.muted, marginTop: 4 } as TextStyle,
  row: { paddingVertical: spacing.sm },
  total: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.muted,
    paddingTop: spacing.md - 4,
    marginTop: spacing.sm,
  },
});

const styles = StyleSheet.create({
  key: {
    borderRadius: radius.key,
    borderBottomWidth: 4,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  keyPressed: { transform: [{ translateY: 3 }], shadowOpacity: 0.08, shadowRadius: 1, elevation: 1 },
  keyLabel: { fontFamily: fonts.bold, ...type.label, textTransform: 'uppercase' },
  keyValue: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, marginTop: 2 },
  display: {
    backgroundColor: machine.display,
    borderRadius: radius.display,
    padding: spacing.gutter,
    borderWidth: 2,
    borderColor: '#2B2F36',
    // A faint light catch along the top of the glass.
    borderTopColor: '#3A3F48',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  displayLabel: { fontFamily: fonts.bold, ...type.label, color: machine.label, textTransform: 'uppercase' },
  digits: {
    fontFamily: fonts.display,
    color: machine.digit,
    textAlign: 'right',
    letterSpacing: 1.5,
    marginTop: spacing.xs,
    textShadowColor: 'rgba(111,230,242,0.55)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  displayNote: { fontFamily: fonts.display, fontSize: 13, color: machine.digitDim, textAlign: 'right', letterSpacing: 0.5 },
  tape: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md - 4,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ticks: { flexDirection: 'row', gap: 2, marginTop: 6 },
  tick: { flex: 1, height: 6 },
  noteInk: { color: colors.danger, marginTop: 0 },
  noteAction: { color: colors.text, fontFamily: fonts.monoBold, marginTop: 0 },
});
