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

// Face, hairline edge and legend color. Keys are flat: solid ink, white with a hairline, spruce, red or amber.
const KEY: Record<KeyColor, { face: string; edge: string; text: string }> = {
  grey: { face: machine.key, edge: machine.keyEdge, text: '#FFFFFF' },
  light: { face: machine.keyLight, edge: machine.keyLightEdge, text: colors.text },
  blue: { face: machine.blue, edge: machine.blueEdge, text: '#FFFFFF' },
  red: { face: machine.red, edge: machine.redEdge, text: '#FFFFFF' },
  yellow: { face: machine.yellow, edge: machine.yellowEdge, text: '#4A3A12' },
};

export function keyColors(color: KeyColor) {
  return KEY[color];
}

// A flat key. It dims a little when pressed.
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
        { backgroundColor: k.face, borderColor: k.edge },
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
      {value !== undefined && (
        // Amounts print in the typewriter mono, words in the sans.
        <Text style={[styles.keyValue, !/^[−-]?\$?[\d,.]+$/.test(value) && styles.keyWords, { color: text }]}>{value}</Text>
      )}
    </>
  );
}

// The headline readout: a big typewriter-style amount with a label and a note. No box, just ink on paper.
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

// A number (typed or formatted) splits into sign, dollars and cents so the cents can be printed smaller.
const NUMBER = /^(-?)([\d,]*)(\.\d*)?$/;

export function DisplayDigits({
  children,
  size = type.hero.fontSize,
  roll = false,
  align = 'left',
  accessibilityLabel,
}: {
  children: string;
  size?: number;
  roll?: boolean;
  align?: 'left' | 'center';
  accessibilityLabel?: string;
}) {
  const shown = useRolling(children, roll);
  const parts = NUMBER.exec(shown);
  const small = { fontSize: size * 0.55, color: colors.muted };
  return (
    <Text
      style={[styles.digits, { fontSize: size, lineHeight: size * 1.15, textAlign: align }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessibilityLabel={accessibilityLabel ?? (MONEY.test(children) ? `$${children}` : children)}
    >
      {parts ? (
        <>
          {parts[1] && '−'}
          <Text style={small}>$</Text>
          {parts[2] || '0'}
          {parts[3] !== undefined && <Text style={small}>{parts[3]}</Text>}
        </>
      ) : (
        shown
      )}
    </Text>
  );
}

export function DisplayNote({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'center' }) {
  return <Text style={[styles.displayNote, { textAlign: align }]}>{children}</Text>;
}

// True once a tape has been on screen for a moment, so only rows added after that "print" in.
const TapeReady = createContext<{ current: boolean }>({ current: false });

// A clean sheet, ruled like a receipt.
export function PaperTape({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const ready = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => (ready.current = true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <TapeReady.Provider value={ready}>
      <View style={[styles.tape, { marginBottom: spacing.sm }, style]}>{children}</View>
    </TapeReady.Provider>
  );
}

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

// A thin progress rule. On first view it draws in from the left.
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
    <View style={styles.track} importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { width: `${(shown / ticks) * 100}%`, backgroundColor: ink }]} />
    </View>
  );
}

// A warning on its own sheet in red ink, instead of a colored box.
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

// Text styles for anything on a sheet: names in the sans, amounts in the typewriter mono.
export const tape = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: fonts.label, ...type.body, color: colors.text } as TextStyle,
  amount: { fontFamily: fonts.monoBold, ...type.body, color: colors.text, fontVariant: ['tabular-nums'] } as TextStyle,
  text: { fontFamily: fonts.body, ...type.body, color: colors.text } as TextStyle,
  caption: { fontFamily: fonts.body, ...type.caption, color: colors.muted, marginTop: 4 } as TextStyle,
  row: { paddingVertical: spacing.sm },
  total: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.border,
    paddingTop: spacing.md - 4,
    marginTop: spacing.sm,
  },
});

const styles = StyleSheet.create({
  key: {
    borderRadius: radius.key,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  keyPressed: { opacity: 0.7 },
  keyLabel: { fontFamily: fonts.label, ...type.label },
  keyValue: { fontFamily: fonts.monoBold, fontSize: 20, lineHeight: 26, marginTop: 2 },
  keyWords: { fontFamily: fonts.bold, fontSize: 18 },
  display: { paddingVertical: spacing.sm },
  displayLabel: { fontFamily: fonts.label, ...type.label, color: machine.label },
  digits: {
    fontFamily: fonts.display,
    color: colors.text,
    letterSpacing: -1,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  displayNote: { fontFamily: fonts.label, fontSize: 13, color: colors.accent },
  tape: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.paper,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 },
  fill: { height: 3 },
  noteInk: { color: colors.danger, marginTop: 0 },
  noteAction: { color: colors.text, fontFamily: fonts.bold, marginTop: 0 },
});
