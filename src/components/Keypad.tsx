import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts, spacing } from "./theme";

// Laid out like an adding machine, 7-8-9 on top.
const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "."];

// The typed amount after a key press, e.g. "12.5" + "0" -> "12.50".
export function applyKey(typed: string, key: string): string {
  if (key === "⌫") return typed.slice(0, -1);
  if (key === "C") return "";
  // Drop leading zeros so "00" on an empty amount stays empty.
  const next = (typed + key).replace(/^0+(?=\d)/, "");
  // Allow at most one decimal point and two decimal places.
  if (!/^\d{0,7}(\.\d{0,2})?$/.test(next)) return typed;
  return next === "." ? "0." : next === "0" ? "" : next;
}

export const typedCents = (typed: string) =>
  typed ? Math.round(Number(typed) * 100) : 0;

// A ruled number pad, like the keys printed on a ledger: no key shapes, just hairlines.
export function Keypad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View style={local.pad}>
      {KEYS.map((k, i) => (
        <PadKey key={k} label={k} onPress={() => onPress(k)} style={i % 3 < 2 ? local.ruled : undefined} />
      ))}
      <PadKey label="C" accessibilityLabel="Clear" onPress={() => onPress("C")} style={[local.wide, local.ruled]} />
      <PadKey label="⌫" accessibilityLabel="Delete last digit" onPress={() => onPress("⌫")} style={local.wide} />
    </View>
  );
}

function PadKey({
  label,
  onPress,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [local.key, style, pressed && local.pressed]}
    >
      <Text style={[local.keyText, label === "C" && local.wordText]}>{label}</Text>
    </Pressable>
  );
}

export const keypadStyles = StyleSheet.create({
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  key: {
    width: "33.333%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  // The hairline between columns.
  ruled: { borderRightWidth: 1 },
  wide: { width: "50%" },
  pressed: { backgroundColor: colors.border },
  keyText: { fontFamily: fonts.keys, fontSize: 26, color: colors.text },
  wordText: { fontFamily: fonts.label, fontSize: 20 },
});

const local = keypadStyles;
