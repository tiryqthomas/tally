import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  applyKey,
  Keypad,
  keypadStyles,
  typedCents,
} from "@/components/Keypad";
import { LimitChart } from "@/components/LimitChart";
import {
  digits,
  Display,
  DisplayDigits,
  DisplayLabel,
  DisplayNote,
  Key,
} from "@/components/machine";
import { fonts, spacing, themed, useScheme } from "@/components/theme";
import { Button, styles as ui } from "@/components/ui";
import { currentMonth, monthLabel } from "@/lib/dates";
import { useBudgetData, useMonthSummary } from "@/lib/hooks";
import { limitHistory, scaleTop } from "@/lib/limits";
import { formatMoney } from "@/lib/money";
import { SAVINGS_NAME, useBudget } from "@/lib/store";

const STEP = 1000;

const asTyped = (cents: number) =>
  cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100);

// Sets a category's monthly limit on the calculator, against what it used in past months.
export default function EditLimit() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const month = currentMonth();
  const data = useBudgetData();
  const summary = useMonthSummary(month);
  const row = summary.envelopes.find((e) => e.envelope.id === id);
  const savings = summary.envelopes.find((e) => e.envelope.isSavings);
  const history = useMemo(
    () => limitHistory(data, id, month),
    [data, id, month],
  );

  const [typed, setTyped] = useState(row ? asTyped(row.limit) : "");
  // After a drag or a −/+ press, the next digit typed starts a new amount.
  const [fresh, setFresh] = useState(true);
  const [dragging, setDragging] = useState(false);
  const cents = typedCents(typed);
  const [top, setTop] = useState(() =>
    scaleTop(
      row?.limit ?? 0,
      history.average,
      used(history.current),
      ...history.past.map(used),
    ),
  );

  if (!row) {
    return (
      <View style={[ui.screen, { padding: spacing.md }]}>
        <Text style={ui.body}>This category no longer exists.</Text>
      </View>
    );
  }

  function set(next: number) {
    setTyped(asTyped(next));
    setFresh(true);
    if (!dragging) setTop((t) => Math.max(t, scaleTop(next)));
  }

  function press(key: string) {
    const next = applyKey(fresh && key !== "⌫" ? "" : typed, key);
    setTyped(next);
    setFresh(false);
    setTop((t) => Math.max(t, scaleTop(typedCents(next))));
  }

  function save() {
    if (cents !== row!.limit)
      useBudget.getState().setEnvelopeLimit(row!.envelope.id, cents);
    router.back();
  }

  const savingsAfter = (savings?.limit ?? 0) + row.limit - cents;
  const monthName = monthLabel(month).split(" ")[0];

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ padding: spacing.md }}
      scrollEnabled={!dragging}
    >
      <Stack.Screen options={{ title: `${row.envelope.name} limit` }} />
      <Display style={{ marginBottom: spacing.md }}>
        <DisplayLabel>Monthly limit</DisplayLabel>
        <View accessibilityLabel={`Limit ${formatMoney(cents)}`}>
          <DisplayDigits size={48}>{typed || "0."}</DisplayDigits>
        </View>
        <DisplayNote>
          {history.past.length ? `Average $${digits(history.average)} · ` : ""}
          Savings ${digits(savingsAfter)} a month
        </DisplayNote>
        <LimitChart
          history={history}
          limit={cents}
          top={top}
          onChange={set}
          onDragging={(d) => {
            setDragging(d);
            if (!d) setTop((t) => Math.max(t, scaleTop(cents)));
          }}
        />
      </Display>

      <View style={local.steps}>
        <Key
          color="light"
          onPress={() => set(Math.max(0, cents - STEP))}
          style={local.step}
          accessibilityLabel="Ten dollars less"
        >
          <Text style={keypadStyles.keyText}>−10</Text>
        </Key>
        <Key
          color="light"
          onPress={
            history.past.length
              ? () => set(Math.round(history.average / 100) * 100)
              : undefined
          }
          disabled={!history.past.length}
          style={local.step}
          accessibilityLabel="Set to your average"
        >
          <Text style={[keypadStyles.keyText, local.avgText]}>Avg</Text>
        </Key>
        <Key
          color="light"
          onPress={() => set(cents + STEP)}
          style={local.step}
          accessibilityLabel="Ten dollars more"
        >
          <Text style={keypadStyles.keyText}>+10</Text>
        </Key>
      </View>

      <Keypad onPress={press} />

      <Text style={[ui.muted, { marginBottom: spacing.sm }]}>
        {savingsAfter < 0
          ? `With this limit, your limits add up to ${formatMoney(-savingsAfter)} more than your income each month.`
          : `${SAVINGS_NAME} gets ${formatMoney(savingsAfter)} a month with this limit.`}
      </Text>
      <Button
        title={cents === row.limit ? "Done" : `Set limit from ${monthName} on`}
        onPress={save}
      />
    </ScrollView>
  );
}

const used = (u: { spent: number; bills: number }) => u.spent + u.bills;

const local = themed(() => StyleSheet.create({
  steps: { flexDirection: "row", gap: 8, marginBottom: 8 },
  step: { flex: 1, alignItems: "center", paddingVertical: 12 },
  avgText: { fontFamily: fonts.label, fontSize: 20 },
}));
