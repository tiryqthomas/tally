import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { digits, Display, DisplayDigits, DisplayLabel, DisplayNote, Key, KeyLabel, PaperTape, PrintIn, tape, TickBar } from '@/components/machine';
import { colors, spacing } from '@/components/theme';
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
        <DisplayDigits roll>{digits(saved)}</DisplayDigits>
        <DisplayNote>${digits(perMonth)} a month from savings</DisplayNote>
        {savings && <DisplayNote>Savings left ${digits(savings.available)}</DisplayNote>}
      </Display>

      <Key color="light" style={{ marginTop: spacing.md }} onPress={() => router.push('/goal')} accessibilityLabel="Add a goal">
        <KeyLabel color="light" label="+ New goal" value="Something to buy" />
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
            <PrintIn key={p.goal.id}>
              <GoalTape progress={p} onPress={() => router.push({ pathname: '/goal', params: { id: p.goal.id } })} />
            </PrintIn>
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
                style={[tape.line, tape.row]}
              >
                <Text style={[tape.text, { flex: 1, color: colors.muted }]} numberOfLines={1}>
                  {p.goal.name} · {monthLabel(p.goal.boughtMonth!)}
                </Text>
                <Text style={[tape.text, { color: colors.muted }]}>{digits(p.saved)} √</Text>
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
  const target = shortDateLabel(p.goal.targetDate);
  let plan: string;
  if (p.status === 'saved') plan = `Fully saved · ready to buy`;
  else if (p.allocation === 0) plan = `Paused · needs ${digits(p.suggested)} a month for ${target}`;
  else if (behind) plan = `${digits(p.allocation)} a month · needs ${digits(p.suggested)} for ${target}`;
  else plan = `${digits(p.allocation)} a month · done ${monthLabel(p.doneMonth!)}`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${p.goal.name} goal`}>
      <PaperTape>
        <View style={tape.line}>
          <Text style={[tape.name, { flex: 1 }]} numberOfLines={1}>
            {p.goal.name}
          </Text>
          <Text style={[tape.caption, { marginTop: 0 }]}>by {target}</Text>
        </View>
        <View style={[tape.line, { marginTop: spacing.xs }]}>
          <Text style={tape.text}>{digits(p.saved)}</Text>
          <Text style={tape.text}>of {digits(p.goal.price)}</Text>
        </View>
        <TickBar fraction={p.goal.price > 0 ? p.saved / p.goal.price : 1} />
        <Text style={[tape.caption, ink]}>
          {behind ? `◆ ${plan}` : `${plan} ${p.status === 'saved' ? '*' : '+'}`}
        </Text>
      </PaperTape>
    </Pressable>
  );
}
