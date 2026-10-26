import { StyleSheet, Text, View } from "react-native";

import { Key } from "./machine";
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

export function Keypad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View style={local.pad}>
      {KEYS.map((k) => (
        <Key
          key={k}
          onPress={() => onPress(k)}
          style={local.key}
          accessibilityLabel={k}
        >
          <Text style={local.keyText}>{k}</Text>
        </Key>
      ))}
      <Key
        color="light"
        onPress={() => onPress("C")}
        style={local.wideKey}
        accessibilityLabel="Clear"
      >
        <Text style={[local.keyText, local.darkText]}>C</Text>
      </Key>
      <Key
        color="light"
        onPress={() => onPress("⌫")}
        style={local.wideKey}
        accessibilityLabel="Delete last digit"
      >
        <Text style={[local.keyText, local.darkText]}>⌫</Text>
      </Key>
    </View>
  );
}

export const keypadStyles = StyleSheet.create({
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  key: {
    width: "31.5%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  wideKey: {
    width: "48%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  keyText: { fontFamily: fonts.display, fontSize: 26, color: "#fff" },
  darkText: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
});

const local = keypadStyles;
