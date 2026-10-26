import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { digits, Display, DisplayDigits, DisplayLabel, DisplayNote, Key, KeyLabel, PaperTape, TickBar } from '@/components/machine';
import { colors, fonts, spacing } from '@/components/theme';
import { SectionTitle, styles } from '@/components/ui';
import { currentMonth, monthLabel, shortDateLabel } from '@/lib/dates';
import { goalProgress, type GoalProgress } from '@/lib/goals';
import { useMonthSummary } from '@/lib/hooks';
import { useBudget } from '@/lib/store';

export default function GoalsScreen() {
  const router = useRouter();
  const month = currentMonth();
  const goals = useBudget((s) => s.goals);
  const savings = useMonthSummary(month).envelopes.find((e) => e.envelope.isSavings);
  const progress = useMemo(
    () => goals.filter((g) => !g.removedMonth).map((g) => goalProgress(g, month)),
    [goals, month],
  );
  const open = progress.filter((p) => p.status !== 'bought');
  const bought = progress.filter((p) => p.status === 'bought');
  const saved = open.reduce((t, p) => t + p.saved, 0);
  const perMonth = open.filter((p) => p.status !== 'saved').reduce((t, p) => t + p.allocation, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Display>
        <DisplayLabel>Saved for goals</DisplayLabel>
        <DisplayDigits>{digits(saved)}</DisplayDigits>
        <DisplayNote>{digits(perMonth)} / MO FROM SAVINGS</DisplayNote>
        {savings && <DisplayNote>SAVINGS LEFT {digits(savings.available)}</DisplayNote>}
      </Display>

      <Key color="blue" style={{ marginTop: spacing.md }} onPress={() => router.push('/goal')} accessibilityLabel="Add a goal">
        <KeyLabel color="blue" label="+ New goal" value="Something to buy" />
      </Key>

      {open.length === 0 ? (
        <Text style={[styles.muted, { marginTop: spacing.md }]}>
          Add something you want to buy, when you want it, and how much to put toward it each month. That amount comes out
          of Savings / Discretionary on the 1st, so you can't spend it by accident.
        </Text>
      ) : (
        <>
          <SectionTitle>Saving for</SectionTitle>
          {open.map((p) => (
            <GoalTape key={p.goal.id} progress={p} onPress={() => router.push({ pathname: '/goal', params: { id: p.goal.id } })} />
          ))}
          <Text style={styles.muted}>Set aside on the 1st of each month from Savings / Discretionary.</Text>
        </>
      )}

      {bought.length > 0 && (
        <>
          <SectionTitle>Bought</SectionTitle>
          <PaperTape>
            {bought.map((p) => (
              <Pressable
                key={p.goal.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/goal', params: { id: p.goal.id } })}
                style={[local.line, { paddingVertical: 4 }]}
              >
                <Text style={[local.tape, { flex: 1, color: colors.muted }]} numberOfLines={1}>
                  {p.goal.name.toUpperCase()} · {monthLabel(p.goal.boughtMonth!).toUpperCase()}
                </Text>
                <Text style={[local.tape, { color: colors.muted }]}>{digits(p.saved)} ✓</Text>
              </Pressable>
            ))}
          </PaperTape>
        </>
      )}
    </ScrollView>
  );
}

// One goal printed on the tape: saved of price, a bar, then the monthly plan.
function GoalTape({ progress: p, onPress }: { progress: GoalProgress; onPress: () => void }) {
  const behind = p.status === 'behind';
  const ink = behind ? { color: colors.danger } : undefined;
  const target = shortDateLabel(p.goal.targetDate).toUpperCase();
  let plan: string;
  if (p.status === 'saved') plan = `FULLY SAVED · READY TO BUY`;
  else if (p.allocation === 0) plan = `PAUSED · NEEDS ${digits(p.suggested)} / MO FOR ${target}`;
  else if (behind) plan = `${digits(p.allocation)} / MO · NEEDS ${digits(p.suggested)} FOR ${target}`;
  else plan = `${digits(p.allocation)} / MO · DONE ${monthLabel(p.doneMonth!).toUpperCase()}`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${p.goal.name} goal`}>
      <PaperTape>
        <View style={local.line}>
          <Text style={[local.tapeBold, { flex: 1 }]} numberOfLines={1}>
            {p.goal.name.toUpperCase()}
          </Text>
          <Text style={local.tapeSmall}>BY {target}</Text>
        </View>
        <View style={[local.line, { marginTop: 4 }]}>
          <Text style={local.tape}>{digits(p.saved)}</Text>
          <Text style={local.tape}>OF {digits(p.goal.price)}</Text>
        </View>
        <TickBar fraction={p.goal.price > 0 ? p.saved / p.goal.price : 1} />
        <Text style={[local.tapeSmall, ink]}>
          {plan} {behind ? '◆' : p.status === 'saved' ? '*' : '+'}
        </Text>
      </PaperTape>
    </Pressable>
  );
}

const local = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  tape: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  tapeBold: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.text },
  tapeSmall: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 3 },
});
