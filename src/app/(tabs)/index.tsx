import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SpendLineChart } from '@/components/charts';
import { Fab } from '@/components/Fab';
import { chart, colors, radius, spacing } from '@/components/theme';
import { Card, ProgressBar, SectionTitle, styles } from '@/components/ui';
import { billsBetween, dailySpending, nextSevenDays, spendingPace } from '@/lib/analysis';
import { billKey, billsInMonth, billStatus, type EnvelopeMonth } from '@/lib/budget';
import { currentMonth, daysInMonth, monthLabel, shortDateLabel, today, weekdayOf } from '@/lib/dates';
import { useBudgetData, useMonthSummary } from '@/lib/hooks';
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
  const data = useBudgetData();
  const todayDate = today();
  const todayDay = Number(todayDate.slice(8, 10));
  const pace = useMemo(() => spendingPace(data, month, todayDay), [data, month, todayDay]);
  const points = useMemo(() => dailySpending(data.expenses, month, todayDay), [data.expenses, month, todayDay]);
  const fixedThisMonth = useMemo(() => billsInMonth(bills, month).reduce((t, o) => t + o.bill.amount, 0), [bills, month]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.muted}>{monthLabel(month)} · left to spend</Text>
        <Text style={[styles.big, totalAvailable < 0 && { color: colors.danger }]}>{formatMoney(totalAvailable)}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Tile color={chart.fixed} label="Fixed bills" value={formatMoney(fixedThisMonth, { showCents: false })} note="every month" />
          <Tile
            color={chart.variable}
            label="Variable spent"
            value={formatMoney(pace.spent, { showCents: false })}
            note={`of ${formatMoney(pace.budget, { showCents: false })}`}
          />
        </View>

        <Pressable onPress={() => router.push('/spending')} accessibilityRole="button" accessibilityLabel="Spending details">
          <Card style={{ marginTop: spacing.sm }}>
            <View style={styles.row}>
              <Text style={styles.title}>Spending</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <Text style={[styles.muted, pace.ahead > 0 && { color: colors.danger }]}>
              {pace.ahead > 0
                ? `${formatMoney(pace.ahead, { showCents: false })} ahead of an even pace`
                : `${formatMoney(-pace.ahead, { showCents: false })} under an even pace`}
            </Text>
            <SpendLineChart points={points} budget={pace.budget} days={daysInMonth(month)} month={month} height={110} interactive={false} />
          </Card>
        </Pressable>

        <BillsWidget onPress={() => router.push('/bills')} />

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

function Tile({ color, label, value, note }: { color: string; label: string; value: string; note: string }) {
  return (
    <Card style={{ flex: 1, marginBottom: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={styles.muted}>{label}</Text>
      </View>
      <Text style={[styles.title, { fontSize: 22, marginTop: 4 }]}>{value}</Text>
      <Text style={styles.muted}>{note}</Text>
    </Card>
  );
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The next seven days of fixed bills. Tapping opens the full bills calendar.
function BillsWidget({ onPress }: { onPress: () => void }) {
  const bills = useBudget((s) => s.bills);
  const paidBills = useBudget((s) => s.paidBills);
  const todayDate = today();
  const week = useMemo(() => nextSevenDays(todayDate), [todayDate]);
  const upcoming = useMemo(() => billsBetween(bills, week[0], week[6]), [bills, week]);
  const total = upcoming.reduce((t, o) => t + o.bill.amount, 0);
  const paid = new Set(paidBills);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Bills details">
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>Bills this week</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <Text style={styles.muted}>
          {upcoming.length === 0
            ? 'Nothing due in the next 7 days'
            : `${formatMoney(total)} across ${upcoming.length} ${upcoming.length === 1 ? 'bill' : 'bills'}`}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: spacing.sm, gap: 4 }}>
          {week.map((date) => {
            const due = upcoming.filter((o) => o.date === date);
            const amount = due.reduce((t, o) => t + o.bill.amount, 0);
            const isToday = date === todayDate;
            return (
              <View
                key={date}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderRadius: radius.sm,
                  backgroundColor: due.length ? '#E6EAFB' : 'transparent',
                  borderWidth: isToday ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text style={[styles.muted, { fontSize: 11 }]}>{WEEKDAY[weekdayOf(date)]}</Text>
                <Text style={[styles.body, { fontWeight: isToday ? '700' : '400' }]}>{Number(date.slice(8, 10))}</Text>
                <Text style={{ fontSize: 10, color: chart.fixed, fontWeight: '600', minHeight: 13 }}>
                  {amount ? formatMoney(amount, { showCents: false }) : ''}
                </Text>
              </View>
            );
          })}
        </View>
        {upcoming.slice(0, 3).map((o) => (
          <View key={`${o.bill.id}${o.date}`} style={[styles.row, { marginTop: spacing.sm }]}>
            <Text style={[styles.body, paid.has(billKey(o.bill.id, o.date)) && { color: colors.muted }]}>
              {o.bill.name} · {shortDateLabel(o.date)}
            </Text>
            <Text style={styles.body}>{formatMoney(o.bill.amount)}</Text>
          </View>
        ))}
        {upcoming.length > 3 && <Text style={[styles.muted, { marginTop: spacing.xs }]}>and {upcoming.length - 3} more</Text>}
      </Card>
    </Pressable>
  );
}
