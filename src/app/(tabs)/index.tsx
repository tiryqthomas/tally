import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { colors, spacing } from '@/components/theme';
import { Card, ProgressBar, SectionTitle, styles } from '@/components/ui';
import { billsInMonth, billStatus, type EnvelopeMonth } from '@/lib/budget';
import { currentMonth, monthLabel, today } from '@/lib/dates';
import { useMonthSummary } from '@/lib/hooks';
import { formatMoney } from '@/lib/money';
import { useBudget } from '@/lib/store';

export default function HomeScreen() {
  const router = useRouter();
  const month = currentMonth();
  const summary = useMonthSummary(month);
  const savings = summary.envelopes.find((e) => e.envelope.isSavings);
  const others = summary.envelopes.filter((e) => !e.envelope.isSavings);
  const bills = useBudget((s) => s.bills);
  const paidBills = useBudget((s) => s.paidBills);
  const overdue = useMemo(() => {
    const paid = new Set(paidBills);
    return billsInMonth(bills, month).filter((o) => billStatus(o.bill.id, o.date, paid, today()) === 'overdue');
  }, [bills, paidBills, month]);
  const totalAvailable = summary.envelopes.reduce((t, e) => t + e.available, 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.muted}>{monthLabel(month)} · left to spend</Text>
        <Text style={[styles.big, totalAvailable < 0 && { color: colors.danger }]}>{formatMoney(totalAvailable)}</Text>

        {summary.overAssigned > 0 && (
          <Card style={{ marginTop: spacing.md, backgroundColor: colors.dangerSoft }}>
            <Text style={styles.body}>
              Your envelope limits are {formatMoney(summary.overAssigned)} more than your income, so{' '}
              {savings?.envelope.name ?? 'savings'} started this month below zero. Lower a limit to fix it.
            </Text>
          </Card>
        )}

        {overdue.length > 0 && (
          <Pressable onPress={() => router.push('/bills')}>
            <Card style={{ marginTop: spacing.sm, backgroundColor: colors.dangerSoft }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Ionicons name="calendar" size={20} color={colors.danger} />
                <Text style={[styles.body, { flex: 1 }]}>
                  Not marked paid yet: {overdue.map((o) => o.bill.name).join(', ')}. Tap to review your bills.
                </Text>
              </View>
            </Card>
          </Pressable>
        )}

        {summary.totalCovered > 0 && (
          <Card style={{ marginTop: spacing.sm, backgroundColor: colors.dangerSoft }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.body, { flex: 1 }]}>
                {formatMoney(summary.totalCovered)} was pulled from {savings?.envelope.name ?? 'savings'} this month to
                cover{' '}
                {summary.envelopes
                  .filter((e) => e.coveredBySavings > 0)
                  .map((e) => `${e.envelope.name} (${formatMoney(e.coveredBySavings)})`)
                  .join(', ')}
                .
              </Text>
            </View>
          </Card>
        )}

        <SectionTitle>Envelopes</SectionTitle>
        {others.map((e) => (
          <EnvelopeRow key={e.envelope.id} row={e} onPress={() => router.push(`/envelope/${e.envelope.id}`)} />
        ))}
        <Pressable onPress={() => router.push('/new-envelope')} style={{ paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add envelope</Text>
        </Pressable>

        {savings && (
          <>
            <SectionTitle>Savings</SectionTitle>
            <EnvelopeRow row={savings} onPress={() => router.push(`/envelope/${savings.envelope.id}`)} />
            <Text style={styles.muted}>
              Gets whatever income your other envelopes don't use, covers any envelope that runs out, and carries its
              balance month to month.
            </Text>
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/add-expense')} />
    </View>
  );
}

function EnvelopeRow({ row, onPress }: { row: EnvelopeMonth; onPress: () => void }) {
  const budget = row.limit + row.rollover + row.transfersIn - row.transfersOut;
  // Includes money the savings envelope handed to other envelopes.
  const used = budget - row.available;
  const negative = row.available < 0;
  // Red only when money ran out, not when bills used the envelope exactly as planned.
  const overspent = row.coveredBySavings > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>{row.envelope.name}</Text>
          <Text style={[styles.title, (negative || overspent) && { color: colors.danger }]}>{formatMoney(row.available)}</Text>
        </View>
        <View style={{ marginVertical: spacing.sm }}>
          <ProgressBar fraction={budget > 0 ? used / budget : negative ? 1 : 0} danger={negative || overspent} />
        </View>
        <Text style={styles.muted}>
          {row.envelope.isSavings
            ? `${formatMoney(row.limit)} added this month · ${formatMoney(row.rollover)} carried over`
            : `${formatMoney(row.spent)} spent${row.billsSetAside > 0 ? ` · ${formatMoney(row.billsSetAside)} for bills` : ''} · of ${formatMoney(budget)}`}
        </Text>
      </Card>
    </Pressable>
  );
}
